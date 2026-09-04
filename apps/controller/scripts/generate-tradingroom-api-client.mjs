#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';

const specPath = fileURLToPath(new URL('../../../services/api/openapi/v1.json', import.meta.url));
const outputPath = fileURLToPath(new URL('../src/lib/server/tradingroom-api.generated.ts', import.meta.url));

const spec = JSON.parse(await readFile(specPath, 'utf8'));

function referenceName(reference) {
  const prefix = '#/components/schemas/';
  if (!reference.startsWith(prefix)) throw new Error(`unsupported reference: ${reference}`);
  return reference.slice(prefix.length);
}

function schemaType(schema) {
  if (Object.keys(schema).length === 0) return 'unknown';
  if (schema.$ref) return referenceName(schema.$ref);
  if (Array.isArray(schema.enum)) return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
  if (Array.isArray(schema.type)) {
    return schema.type.map((type) => (type === 'null' ? 'null' : schemaType({ ...schema, type }))).join(' | ');
  }
  if (schema.type === 'array') return `Array<${schemaType(schema.items)}>`;
  if (schema.type === 'object') {
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const members = Object.entries(properties).map(
      ([name, property]) => `readonly ${JSON.stringify(name)}${required.has(name) ? '' : '?'}: ${schemaType(property)};`
    );
    if (schema.additionalProperties === true) members.push('readonly [key: string]: unknown;');
    return `{ ${members.join(' ')} }`;
  }
  if (schema.type === 'string') return 'string';
  if (schema.type === 'integer' || schema.type === 'number') return 'number';
  if (schema.type === 'boolean') return 'boolean';
  throw new Error(`unsupported schema: ${JSON.stringify(schema)}`);
}

const schemas = Object.entries(spec.components.schemas)
  .map(([name, schema]) => `export type ${name} = ${schemaType(schema)};`)
  .join('\n\n');

const operations = [];
for (const [path, pathItem] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (method === 'parameters') continue;
    const success = Object.entries(operation.responses).find(([status]) => /^2\d\d$/.test(status));
    if (!success) throw new Error(`${operation.operationId} has no 2xx response`);
    const [status, response] = success;
    const responseSchema = response.content?.['application/json']?.schema;
    const requestSchema = operation.requestBody?.content?.['application/json']?.schema;
    operations.push(
      `  readonly ${operation.operationId}: { readonly method: ${JSON.stringify(method.toUpperCase())}; readonly path: ${JSON.stringify(path)}; readonly request: ${requestSchema ? schemaType(requestSchema) : 'undefined'}; readonly response: ${responseSchema ? schemaType(responseSchema) : 'null'}; readonly successStatus: ${Number(status)}; };`
    );
  }
}

const generated = await format(
  `/**
 * GENERATED from services/api/openapi/v1.json by
 * apps/controller/scripts/generate-tradingroom-api-client.mjs.
 * Do not edit by hand; run \`pnpm api:client:generate\`.
 */

${schemas}

export interface TradingRoomApiOperations {
${operations.join('\n')}
}

export type TradingRoomApiOperation = keyof TradingRoomApiOperations;
`,
  {
    parser: 'typescript',
    printWidth: 120,
    singleQuote: true,
    trailingComma: 'none',
    useTabs: false
  }
);

if (process.argv.includes('--stdout')) {
  process.stdout.write(generated);
} else if (process.argv.includes('--check')) {
  const current = await readFile(outputPath, 'utf8').catch(() => '');
  if (current !== generated) {
    console.error('Generated Trading Room API client is stale; run pnpm api:client:generate.');
    process.exitCode = 1;
  }
} else {
  await writeFile(outputPath, generated);
  console.log(`Generated ${operations.length} operations and ${Object.keys(spec.components.schemas).length} schemas.`);
}
