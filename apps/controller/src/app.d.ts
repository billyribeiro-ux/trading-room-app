import type { AccountBootstrap } from './lib/server/tradingroom-api.generated.js';

declare global {
  namespace App {
    interface Error {
      message: string;
      errorId?: string;
    }

    interface Locals {
      /** Request-local canonical session proof populated by the global protected-route hook. */
      authorityBootstrap?: AccountBootstrap;
      user?: {
        id: number;
        email: string;
        displayName: string;
        accountId: number;
        /**
         * When this address was proved, or null if it never was.
         *
         * On the identity rather than fetched where it is needed, because the alternative is a
         * second read per gate and the first gate somebody forgets to add is the one that matters.
         * Null does NOT by itself mean "blocked" — see `emailIsProved`, which is inert on a
         * deployment that cannot send mail.
         */
        emailVerifiedAt: Date | null;
        /** Stable ids written only by the offline authority converter. */
        authorityUserId: string | null;
        authorityEnterpriseId: string | null;
        /**
         * Set ONLY while an operator is impersonating this identity — the operator's own user id.
         *
         * Its presence is what `/admin` refuses on and what renders the banner. Deliberately on the
         * identity rather than beside it: anything that reads `locals.user` sees, in the same
         * object, that this is not really them.
         */
        impersonatedBy?: number;
        impersonationExpiresAt?: Date;
      };
    }
  }
}
export {};
