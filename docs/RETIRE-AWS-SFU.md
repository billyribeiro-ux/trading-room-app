# Retiring the old SFU on AWS — every step, every command

**Written 2026-08-10 05:0x EDT.** One page, start to finish, for shutting down the second media
server at `34.195.170.147`. Follow it top to bottom; nothing here depends on anything outside this
file except an AWS sign-in.

---

## First: it is **EC2**, not Lightsail. That is why you could not find it

You said, more than once, that you never deployed a Lightsail instance. **You were right.** Every
document in this repository said "AWS Lightsail, instance `mediasoup-test-01`, us-east-1a" — that
sentence came from the Stage 1 *plan* in `apps/controller/docs/MEDIASOUP-DEPLOYMENT-PLAN.md` and was
copied between four documents until a plan read as a measurement. Nobody had ever asked the machine
what it was.

Asked on 2026-08-10 at 04:56 EDT:

```console
$ whois 34.195.170.147
Organization:  Amazon Technologies Inc. (AT-88-Z)
NetRange:      34.192.0.0 - 34.255.255.255

$ dig +short -x 34.195.170.147
ec2-34-195-170-147.compute-1.amazonaws.com.
```

`ec2-<ip>.compute-1.amazonaws.com` is **EC2**'s own reverse-DNS format, and `compute-1` is Amazon's
legacy name for **us-east-1** (N. Virginia). So: right company, right region, wrong *product* in
every document. There is no Lightsail instance to delete. There is an **EC2 instance**.

**If you look in the Lightsail console you will keep seeing an empty page, and that page is correct.**

---

## What it is, and what happens when it stops

| | |
| --- | --- |
| Address | `34.195.170.147`, served as `https://media.34-195-170-147.sslip.io` |
| What it runs | this project's own mediasoup SFU, behind Caddy on 443 → loopback `127.0.0.1:4443` |
| Certificate | Let's Encrypt, issued **2026-08-02** |
| Open ports seen from outside | TCP **22** and **443** |
| In use? | **No.** `/health` reported `rooms:0, peers:0` at 2026-08-10 04:56 EDT |
| Referenced by this repo? | **No.** Verified 2026-08-09 by reading — not grepping — `apps/`, `services/`, `ops/`, `scripts/`, every `.env` and `.env.example`, and the live Caddyfile on the Hetzner box. Zero references. |
| What replaced it | `media.tradingroom.app` on the Hetzner box `87.99.154.155`, live since 2026-08-09 12:44 EDT |

**Nothing in the product breaks when this is switched off.** The room connects to
`media.tradingroom.app` and to nothing else. That is measured, not assumed.

Two reasons it is still worth doing:

1. **It bills for existing.** An EC2 instance is charged by the hour whether it has 0 peers or 400,
   plus its EBS volume, plus an Elastic IP if one is attached. This document cannot tell you the
   monthly figure — the instance type is only visible from inside the account, and step 2 prints it.
2. **It is exposed.** SSH and HTTPS are open to the internet on a host running a build frozen at
   2026-08-02 that nobody is patching.

Neither is urgent. Both are still true in eight months if nobody does this.

---

## Before you start

You need an AWS sign-in for account **`255248181057`**, IAM user **`trading-app-admin`**, region
**`us-east-1`**. That is what the local CLI is configured against; its session has expired.

**There are two routes and they do the same thing.** Route A is the browser console and needs
nothing installed. Route B is the CLI, is faster, and is what to paste here if you want me to drive
it. Use either.

> **Order matters, and it is the only thing in here that does.** **Stop** before you **terminate**.
> Stopping is reversible and proves nothing depended on the machine; terminating is permanent and
> takes the disk with it. Wait a day between them if you like — a stopped instance costs a fraction
> of a running one.

---

# Route A — the browser console

### A1. Sign in and go to the right place

<https://console.aws.amazon.com/ec2/home?region=us-east-1#Instances:>

That link already selects **EC2** and **us-east-1**. If the console opens in another region the
instance will not be listed — the region selector is top right and must read **N. Virginia**.

### A2. Find it by its IP

In the instances search box paste:

```
34.195.170.147
```

Exactly one instance should match. Click it and note, from the **Details** tab:

- **Instance ID** (`i-…`) — needed for every later step
- **Instance type** (`t3.medium`, `c6i.large`, …) — this is what sets the bill
- **Public IPv4 address** and whether it says **Elastic IP** beside it — decides step A6
- **Launch time**
- **Name** tag, if it has one

### A3. Confirm it is the machine described above

Before stopping anything, open <https://media.34-195-170-147.sslip.io/health> in a tab. It should
return JSON containing `"admission":"require-grant"` and `"rooms":0`. That payload is this project's
own SFU with nobody on it. If it shows a non-zero `peers` count, **someone is connected — stop and
find out who before continuing.**

### A4. Stop it (reversible)

**Instance state → Stop instance → Stop.** Wait for **Stopped**.

Now reload <https://media.34-195-170-147.sslip.io/health>. It must fail to connect. Then load
<https://media.tradingroom.app/health> — it must still answer `"status":"ok"`. That pair is the
proof: the old one is dark, the real one is fine.

**Leave it stopped for as long as you want.** A stopped instance bills only for storage. If anything
turns out to have needed it, **Instance state → Start instance** brings it back unchanged.

### A5. Terminate it (permanent)

**Instance state → Terminate (delete) instance → Terminate.**

The root disk is deleted with it unless somebody changed the default. After termination, check
**Elastic Block Store → Volumes** in the left sidebar and look for any volume left in the
**available** state — that is an orphan that still bills. Select it → **Actions → Delete volume**.

### A6. Release the Elastic IP — the step everyone forgets

If step A2 said **Elastic IP**, go to **Network & Security → Elastic IPs**. An Elastic IP attached to
nothing is **billed hourly**, so terminating the instance without releasing the address leaves a
charge behind for an address doing nothing.

Select `34.195.170.147` → **Actions → Release Elastic IP addresses**.

If A2 did *not* say Elastic IP, it was an auto-assigned public IP; it is gone already and costs
nothing.

### A7. Prove there is no Lightsail, once, so it never comes up again

<https://lightsail.aws.amazon.com/ls/webapp/home/instances>

Expect an empty page. That confirms what you have been saying, and it is worth doing once so the
question is closed with a screenshot rather than an argument.

### A8. Check nothing else in the account is running

<https://console.aws.amazon.com/billing/home#/bills> shows what is actually being charged and for
what — a far better answer than clicking through services. If EC2 still appears next month, something
else exists that this document does not know about.

---

# Route B — the CLI

Everything below is copy-paste. `aws login` is interactive and opens a browser: **run that one
yourself.** After it succeeds, the rest can be run by anyone with the terminal, including me.

### B1. Authenticate

```bash
aws login
aws sts get-caller-identity
```

The second must print account `255248181057` and the `trading-app-admin` user. If it still says
*"Your session has expired"*, the login did not take.

### B2. Find the instance and read its cost drivers

```bash
aws ec2 describe-instances --region us-east-1 \
  --filters 'Name=ip-address,Values=34.195.170.147' \
  --query 'Reservations[].Instances[].{
      id:InstanceId, state:State.Name, type:InstanceType, launched:LaunchTime,
      name:Tags[?Key==`Name`]|[0].Value,
      publicIp:PublicIpAddress, volumes:BlockDeviceMappings[].Ebs.VolumeId
  }' --output table
```

Save the `id` — every later command needs it. Then set it once:

```bash
INSTANCE_ID=i-xxxxxxxxxxxxxxxxx     # paste the real one
```

If this returns an empty list, the address is not an instance's primary IP — it may sit on a network
interface or a load balancer. Widen the search:

```bash
aws ec2 describe-network-interfaces --region us-east-1 \
  --filters 'Name=association.public-ip,Values=34.195.170.147' \
  --query 'NetworkInterfaces[].{eni:NetworkInterfaceId,desc:Description,attachedTo:Attachment.InstanceId}' \
  --output table
```

### B3. Confirm it is idle, from outside

```bash
curl -s https://media.34-195-170-147.sslip.io/health; echo
```

Expect `"rooms":0,"peers":0`. **A non-zero `peers` means somebody is connected — stop here.**

### B4. Stop it (reversible)

```bash
aws ec2 stop-instances --region us-east-1 --instance-ids "$INSTANCE_ID"

aws ec2 wait instance-stopped --region us-east-1 --instance-ids "$INSTANCE_ID"
echo "stopped"
```

### B5. Prove the right one went dark and the live one did not

```bash
echo -n 'old SFU (should FAIL): '
curl -s --max-time 8 https://media.34-195-170-147.sslip.io/health || echo 'unreachable — correct'

echo -n 'live SFU (must answer): '
curl -s --max-time 8 https://media.tradingroom.app/health; echo

node scripts/smoke.mjs
```

`scripts/smoke.mjs` checks all three tiers of the real product in about a second. **It must still
print `All 9 checks passed.`** If it does, nothing depended on the machine you just stopped.

### B6. Terminate it (permanent)

Only after B5 is clean. Optionally wait a day first.

```bash
aws ec2 terminate-instances --region us-east-1 --instance-ids "$INSTANCE_ID"
aws ec2 wait instance-terminated --region us-east-1 --instance-ids "$INSTANCE_ID"
echo "terminated"
```

### B7. Delete any orphaned disk

The root volume is normally deleted with the instance. Check for one that was not:

```bash
aws ec2 describe-volumes --region us-east-1 \
  --filters 'Name=status,Values=available' \
  --query 'Volumes[].{id:VolumeId,size:Size,type:VolumeType,created:CreateTime}' --output table
```

Anything listed is attached to nothing and billing. Delete each:

```bash
aws ec2 delete-volume --region us-east-1 --volume-id vol-xxxxxxxxxxxxxxxxx
```

### B8. Release the Elastic IP if there is one

```bash
aws ec2 describe-addresses --region us-east-1 \
  --query 'Addresses[].{ip:PublicIp,alloc:AllocationId,assoc:AssociationId,instance:InstanceId}' \
  --output table
```

If `34.195.170.147` appears with an empty `instance`, it is an Elastic IP attached to nothing and
**billed hourly**. Release it with its `alloc` value:

```bash
aws ec2 release-address --region us-east-1 --allocation-id eipalloc-xxxxxxxxxxxxxxxxx
```

If the address does not appear at all, it was auto-assigned and is already gone at no cost.

### B9. Prove there is no Lightsail anywhere

```bash
aws lightsail get-instances --region us-east-1 \
  --query 'instances[].{name:name,ip:publicIpAddress,state:state.name}' --output table
```

Expect an empty result. Worth running in the other regions Lightsail is offered in too, since a
console visit only ever shows one region at a time:

```bash
for r in us-east-1 us-east-2 us-west-2 eu-west-1 eu-central-1; do
  echo "== $r"
  aws lightsail get-instances --region "$r" --query 'instances[].name' --output text 2>&1
done
```

### B10. Find anything else the account is paying for

```bash
aws ec2 describe-instances --region us-east-1 \
  --query 'Reservations[].Instances[].{id:InstanceId,state:State.Name,type:InstanceType,ip:PublicIpAddress}' \
  --output table

aws ec2 describe-volumes  --region us-east-1 --query 'Volumes[].{id:VolumeId,state:State,size:Size}' --output table
aws ec2 describe-addresses --region us-east-1 --query 'Addresses[].PublicIp' --output text
aws s3 ls
```

And the only figure that settles it — last month's actual charges by service:

```bash
aws ce get-cost-and-usage --region us-east-1 \
  --time-period Start=2026-07-01,End=2026-08-01 \
  --granularity MONTHLY --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE \
  --query 'ResultsByTime[].Groups[].{service:Keys[0],cost:Metrics.UnblendedCost.Amount}' --output table
```

(Cost Explorer must be enabled on the account for that last one; if it errors, the billing console
in step A8 gives the same answer.)

---

## What you do **not** have to clean up

- **DNS.** `media.34-195-170-147.sslip.io` is not a record anybody created. `sslip.io` is a public
  wildcard resolver that returns whatever IP is embedded in the hostname — no zone, no record, no
  registrar entry. When the instance dies the name resolves to a dead address and that is the end of
  it. **Nothing to delete, and nothing in Porkbun to touch.**
- **The certificate.** Let's Encrypt certificates expire on their own; there is no revocation to do.
- **This repository.** Nothing references the instance, so no code change accompanies the shutdown.
- **`media.tradingroom.app`.** Different machine entirely (Hetzner, `87.99.154.155`). Leave it alone.

## Optional, and only if the account is otherwise empty

The security group and SSH key pair the instance used cost nothing and can stay. If you want a clean
account:

```bash
aws ec2 describe-security-groups --region us-east-1 \
  --query 'SecurityGroups[?GroupName!=`default`].{id:GroupId,name:GroupName}' --output table
aws ec2 delete-security-group --region us-east-1 --group-id sg-xxxxxxxxxxxxxxxxx

aws ec2 describe-key-pairs --region us-east-1 --query 'KeyPairs[].KeyName' --output text
aws ec2 delete-key-pair --region us-east-1 --key-name <name>
```

A security group still attached to something refuses to delete, which makes this safe to attempt.

---

## If something goes wrong

| symptom | what it means | what to do |
| --- | --- | --- |
| `describe-instances` returns `[]` | the IP is not an instance's primary address, or it is in another region | run the `describe-network-interfaces` query in B2; then try `--region us-east-2` and `us-west-2` |
| `UnauthorizedOperation` | `trading-app-admin` lacks EC2 permissions | use the root account in the console (Route A) |
| `Your session has expired` | `aws login` did not complete | re-run `aws login`; confirm with `aws sts get-caller-identity` |
| `scripts/smoke.mjs` fails after B4 | something DID depend on the instance | `aws ec2 start-instances --region us-east-1 --instance-ids "$INSTANCE_ID"`, then work out what — this is exactly why B4 comes before B6 |
| the health URL still answers after stopping | you stopped a different instance | check the instance ID against B2 before terminating anything |

---

## When it is done

Append an entry to `CHANGELOG.md` — dated and timed, per the convention at the top of that file —
recording the instance ID, its type, whether an Elastic IP was released, and the `pnpm smoke` result
afterwards. Then delete item **O** from `TODO.md`.

The three documents that still describe this machine as live —
`docs/SFU-MIGRATION.md`, `docs/NEXT-SESSION.md`, `docs/DEPLOYMENT.md` — should have their
identification notes updated to say it was retired, with the date. They are already correct about
*what* it is; only its status changes.
