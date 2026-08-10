# Retiring the old SFU on AWS — DONE 2026-08-10 05:14 EDT

**It was Lightsail after all.** `mediasoup-test-01`, exactly as the original documents said. It is
now deleted, its static IP released, and the AWS account holds nothing in any region.

This file was written an hour earlier as a runbook built on a wrong identification. It is kept as
the record of what was actually run, and of how the wrong identification happened — because that
mistake is repeatable by anyone with the same two tools.

---

## The correction, first

At 04:56 I reported **"it is EC2 in us-east-1, not Lightsail — the owner was right that no
Lightsail instance was ever deployed."** That was wrong, and it was my error, not an inherited one.

The evidence I used:

```console
$ whois 34.195.170.147
Organization:  Amazon Technologies Inc. (AT-88-Z)

$ dig +short -x 34.195.170.147
ec2-34-195-170-147.compute-1.amazonaws.com.
```

Both readings are correct. **The conclusion drawn from them was not.** Lightsail instances *are*
EC2 instances underneath — Lightsail is a managed wrapper over the same infrastructure — so a
Lightsail public IP carries `ec2-<ip>.compute-1.amazonaws.com` reverse DNS just like a bare EC2
instance. **Reverse DNS proves the vendor and the region. It cannot distinguish the product.**

The second signal that looked confirming was also a property of Lightsail rather than a finding:

```console
$ aws ec2 describe-instances --region us-east-1        # → empty, in EVERY region
```

**Lightsail resources do not appear in the EC2 API at all.** An empty `describe-instances` is
exactly what a Lightsail-only account returns, so the sweep that felt like proof was the strongest
sign I was querying the wrong service.

The one command that answers the question is the service's own:

```console
$ aws lightsail get-instances --region us-east-1 --query 'instances[].name' --output text
mediasoup-test-01
```

**The lesson, and it is the house rule in `CLAUDE.md` almost word for word: an inference from two
tools is not evidence, and ruling out my own method comes before reporting a finding.** I told the
owner they were right on the strength of a hostname format. The honest answer at 04:56 was "the
vendor is Amazon and the region is us-east-1; I cannot tell which product without account access."

Where this leaves the older record: **`MEDIASOUP-DEPLOYMENT-PLAN.md`'s Stage 1 description was
accurate all along** — AWS Lightsail, `mediasoup-test-01`, us-east-1a. The 2026-08-09 21:24 entry
that flagged it as "never verified" was fair at the time (nobody here had account access), but its
implication that the product name was wrong is now falsified.

---

## What it actually was, read from the Lightsail API

| | |
| --- | --- |
| Name | `mediasoup-test-01` |
| Location | `us-east-1a` |
| Blueprint | Ubuntu |
| Bundle | `small_3_0` — **$12.00/month**, 2 vCPU, 2.0 GB RAM, 60 GB SSD, 3 TB transfer |
| Created | **2026-08-02 12:54:31 -0400** |
| State at 05:10 | `running` |
| Static IP | `mediasoup-test-ip` = `34.195.170.147`, attached |
| Alarms | `mediasoup-cpu-high`, `mediasoup-status-check-failed` |

So it had been billing **$12/month since 2026-08-02**, which is the one part of the inherited
description — "still billing" — that nobody had been able to confirm until now. It was true.

---

## What was run, in order

Every command below was executed; the output quoted is what came back.

### 1. Authenticate

```console
$ aws sts get-caller-identity
Account  255248181057
Arn      arn:aws:iam::255248181057:user/trading-app-admin
```

### 2. Find it — and the false trail

```console
$ aws ec2 describe-instances --region us-east-1 --filters 'Name=ip-address,Values=34.195.170.147'
                                                    # empty
$ aws ec2 describe-network-interfaces … 'Name=association.public-ip,Values=34.195.170.147'
                                                    # empty
$ aws ec2 describe-addresses --region us-east-1     # empty
$ for r in $(aws ec2 describe-regions …); do aws ec2 describe-instances --region "$r" …; done
                                                    # empty in EVERY region
$ aws lightsail get-instances --region us-east-1 --query 'instances[].name' --output text
mediasoup-test-01                                   # ← there it is
```

### 3. Confirm it was idle before touching it

```console
$ curl -s https://media.34-195-170-147.sslip.io/health
{"status":"ok","workers":1,"workerDeaths":0,"rooms":0,"peers":0,"admission":"require-grant"}

$ curl -s https://media.tradingroom.app/health
{"status":"ok","workers":1,"workerDeaths":0,"rooms":1,"peers":2,"admission":"require-grant"}
```

`rooms:0, peers:0` on the old one — nobody on it. And the live one showing **`rooms:1, peers:2`**,
which is the first time real peers have been observed on the Hetzner SFU.

### 4. Stop (reversible), then prove the right machine went dark

```console
$ aws lightsail stop-instance --region us-east-1 --instance-name mediasoup-test-01
StopInstance  Started
# polled get-instance-state → running → stopping → stopped (about 40 seconds)

$ curl -s --max-time 10 https://media.34-195-170-147.sslip.io/health
unreachable — correct

$ curl -s --max-time 10 https://media.tradingroom.app/health
{"status":"ok", … "rooms":1,"peers":2, …}          # still serving, peers still connected

$ node scripts/smoke.mjs
All 9 checks passed.
```

**That is the step that made the deletion safe.** Stopping is reversible; if anything had depended
on the machine, `smoke.mjs` would have said so while a `start-instance` was still possible.

### 5. Delete (permanent)

```console
$ aws lightsail delete-instance --region us-east-1 --instance-name mediasoup-test-01
DetachStaticIp  mediasoup-test-ip                Succeeded
DetachStaticIp  mediasoup-test-01                Succeeded
DeleteAlarm     mediasoup-cpu-high               Succeeded
DeleteAlarm     mediasoup-status-check-failed    Succeeded
DeleteInstance  mediasoup-test-01                Succeeded
```

Both CloudWatch alarms went with it, which is worth noting: they would otherwise have been left
pointing at a resource that no longer existed.

### 6. Release the static IP — the step that is easy to miss

```console
$ aws lightsail release-static-ip --region us-east-1 --static-ip-name mediasoup-test-ip
ReleaseStaticIp  mediasoup-test-ip  Succeeded
```

A Lightsail static IP is **free while attached to a running instance and billed once it is not**.
Deleting the instance detaches it (see the `DetachStaticIp` line above), so stopping at step 5 would
have left a charge behind for an address pointing at nothing.

### 7. Verify the account is empty, in every region

```console
us-east-1       instances:[] staticIps:[] disks:[] snapshots:[]
us-east-2       instances:[] staticIps:[] disks:[] snapshots:[]
us-west-2       instances:[] staticIps:[] disks:[] snapshots:[]
eu-west-1       instances:[] staticIps:[] disks:[] snapshots:[]
eu-central-1    instances:[] staticIps:[] disks:[] snapshots:[]
eu-west-2       instances:[] staticIps:[] disks:[] snapshots:[]
eu-west-3       instances:[] staticIps:[] disks:[] snapshots:[]
ap-southeast-1  instances:[] staticIps:[] disks:[] snapshots:[]
ap-southeast-2  instances:[] staticIps:[] disks:[] snapshots:[]
ap-northeast-1  instances:[] staticIps:[] disks:[] snapshots:[]
ca-central-1    instances:[] staticIps:[] disks:[] snapshots:[]
```

EC2, EBS and S3 were already empty in every region — checked during the search at step 2.

### 8. Final state

```console
$ curl -s https://media.34-195-170-147.sslip.io/health
dead — correct

$ node scripts/smoke.mjs
All 9 checks passed.
```

---

## What needed no cleanup, and why

- **DNS.** `media.34-195-170-147.sslip.io` was never a record anybody created — `sslip.io` is a
  public wildcard resolver returning whatever IP is embedded in the hostname. No zone, no registrar
  entry, nothing in Porkbun. The name now resolves to an address that answers nothing, which is the
  end of it.
- **The certificate.** Let's Encrypt certificates expire on their own; there is nothing to revoke.
- **This repository.** Verified 2026-08-09 by reading `apps/`, `services/`, `ops/`, `scripts/`,
  every `.env` and `.env.example`, and the live Caddyfile: zero references to that host. No code
  change accompanied the deletion, and `pnpm smoke` passing before and after is the proof.

## If a media server is ever needed on AWS again

Nothing here is reusable as-is; the instance is gone and so is its disk. The reason it existed —
Stage 1 of `apps/controller/docs/MEDIASOUP-DEPLOYMENT-PLAN.md` — is served by the Hetzner box now,
and `docs/SFU-MIGRATION.md` §"Why it has to move at all" records the egress arithmetic that makes
AWS the wrong home for this workload at any real volume.

The one command worth carrying forward is the identification one, since it is what this whole
episode turned on:

```bash
aws lightsail get-instances --region <region> --query 'instances[].name' --output text
```

**Ask the service you suspect. A hostname will not tell you.**
