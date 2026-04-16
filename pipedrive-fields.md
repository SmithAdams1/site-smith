# Pipedrive — Estrutura de Campos

## Person (Contato)

### Campos padrão

| Key | Nome | Tipo |
|-----|------|------|
| `id` | ID | int |
| `name` | Name | varchar |
| `first_name` | First name | varchar |
| `last_name` | Last name | varchar |
| `email` | Email | phone (array `[{label, value, primary}]`) |
| `phone` | Phone | phone (array `[{label, value, primary}]`) |
| `im` | Instant messenger | varchar |
| `owner_id` | Owner | user object `{id, name, email, ...}` |
| `org_id` | Organisation | org object `{name, owner_id, ...}` |
| `label` | Label | enum |
| `label_ids` | Labels (multi) | set → Hot lead, Warm lead, Cold lead, New Lead |
| `visible_to` | Visible to | visible_to |
| `active_flag` | Active | boolean |
| `add_time` | Person created | date |
| `update_time` | Update time | date |
| `birthday` | Birthday | date |
| `notes` | Notes | text |
| `picture_id` | Profile picture | picture |
| `cc_email` | CC email | varchar |
| `open_deals_count` | Open deals | int |
| `closed_deals_count` | Closed deals | int |
| `won_deals_count` | Won deals | int |
| `lost_deals_count` | Lost deals | int |
| `activities_count` | Total activities | int |
| `done_activities_count` | Done activities | int |
| `undone_activities_count` | Activities to do | int |
| `email_messages_count` | Email messages count | int |
| `next_activity_date` | Next activity date | date |
| `last_activity_date` | Last activity date | date |
| `last_incoming_mail_time` | Last email received | date |
| `last_outgoing_mail_time` | Last email sent | date |
| `postal_address` | Postal address | address |
| `postal_address_locality` | City | varchar |
| `postal_address_country` | Country | varchar |
| `postal_address_postal_code` | ZIP/Postal code | varchar |

### Campos customizados (Smith & Adams)

| Key (hash) | Nome | Tipo |
|------------|------|------|
| `d4e7afe93521c58b1adc6bf7d4421a58461dc03d` | Form source | varchar |
| `ffe9828582be8135aaa051403db0f339dc2e78fa` | Linkedin Profile | varchar |
| `7c22583783d9bd3ebe24d9ba6f6d6bbe88a76383` | Facebook Profile | text |
| `4d44c0f01fa4bb7da3ac9a7f60c154af607274df` | Job Title | varchar |
| `8215bb7a1fef7574df48848d7b114f24a603d3e0` | I am considering investing in Portugal to obtain European residency for: | varchar |
| `777b40a7a9371ded13c3aae8b1bb213b23205bab` | Portugal Golden Visa requires an investment starting from EUR 280,000. Can you invest? | varchar |
| `d97d319d1b5e1446508bcf47499d47fe4f01bc09` | When are you planning to invest in the Portugal Golden Visa program? | varchar |

---

## Deal (Negócio)

### Campos padrão

| Key | Nome | Tipo |
|-----|------|------|
| `id` | ID | int |
| `title` | Title | varchar |
| `status` | Status | enum → Open, Lost, Won, Deleted |
| `value` | Value | monetary |
| `currency` | Currency | varchar |
| `pipeline_id` | Pipeline | int (16 = Sales Pipeline Smith & Adams) |
| `stage_id` | Stage | stage (110 = Lead In, 111 = Contacted, ...) |
| `person_id` | Contact person | people object |
| `org_id` | Organisation | org object |
| `user_id` | Owner | user object |
| `creator_user_id` | Creator | user object |
| `label` | Label (multi) | set → Hot, Warm, Cold, New |
| `visible_to` | Visible to | visible_to |
| `probability` | Probability | int |
| `expected_close_date` | Expected close date | date |
| `add_time` | Deal created | date |
| `update_time` | Update time | date |
| `stage_change_time` | Last stage change | date |
| `won_time` | Won time | date |
| `lost_time` | Lost time | date |
| `close_time` | Deal closed on | date |
| `lost_reason` | Lost reason | varchar_options → No Qualifications/Incorrect Profile, Pricing, Timing, Family or Legal Block, No Response/Ghosted, The budget has not been confirmed, Other countries, Outro |
| `origin` | Source origin | enum → Manually created, Import, API, Automation, Web Forms, Chatbot, etc. |
| `activities_count` | Total activities | int |
| `done_activities_count` | Done activities | int |
| `email_messages_count` | Email messages count | int |
| `weighted_value` | Weighted value | monetary |
| `mrr` | MRR | monetary |
| `arr` | ARR | monetary |
| `acv` | ACV | monetary |
| `is_archived` | Archive status | enum |
| `score` | Score | double |
| `cc_email` | CC email | varchar |
| `next_activity_date` | Next activity date | date |
| `last_activity_date` | Last activity date | date |

### Campos customizados (Smith & Adams)

| Key (hash) | Nome | Tipo | Opções |
|------------|------|------|--------|
| `216e52d1153fd4853583f5683a557caf61cc2614` | Lead Source Channel | enum | Meta Ads, Google Ads, LinkedIn Ads, Cold Contact, Instagram Organic, Landing Page |
| `20001128298359946435801a832865d474c0564e` | Type of meeting | set | In person, GMeets, Phone Call, WhatsApp Call |
| `22c4b5b6911622dcb5364cadcc38ece0a95a7840` | Type of Product | set | D2 Visa, Golden Visa, Investment Beato Urban Collection, Undecided |
| `468abeb93ff2e92ca6182eb5b2028faf545ae7ac` | Market/Country | enum | Angola, Bangladesh, Canada, China, Dubai, Hong Kong, India, Pakistan, Singapore, South Africa, Taiwan, Turkey, United Kingdom, United States of America |
| `cfca5ba27416b4ce8320cd0734c3dc93cfd0c081` | Type of Deal | enum | Client, Partnership |
| `ca703bcb748980ad346249bef0a0617acda2a7fe` | Budget Confirmed | enum | Yes, No |
| `f4c810a5c71a48ac4dca4ea6b9be15248698e5e0` | Spouse | enum | Yes, No |
| `83a01347efe3ad3af5cb889121061375147d9a6d` | Dependants <23 | double | — |
| `9c8119538bbbb452cb6b98644acc0acd7ba62cfa` | Dependants >65 | double | — |
| `a0a925f1a282e74b4c5af861a2b1694605a39b50` | Total Family Members | double | — |
| `172d3facb8f783f1d0e0db781dd3fae5375e276f` | Spouse Numerical | double | — |
| `395acf3a7258a9278af4d39f0154e5a9cd5145b1` | Passport | varchar | — |
| `2abf24758ec19392d2a479121faee06382702c6f` | Reservation payment receipt uploaded? | enum | Yes, No |
| `6903b9dd42b0bb34b731621a1ebff3c6850f5746` | Payment receipt uploaded? | enum | Yes, No |
| `78d0417761ac5ca4673acc7ab9ec9cefcf6938dc` | MOU uploaded? | set | Yes, No |
| `027386bd1cab3bb275d369a802d3dfaa0ac15d73` | MOU Signing Date | date | — |
| `ddb4a4029bf78ef504e6211e34e25e8c21f94af1` | Reservation Payment Date | date | — |
| `79515dcdf593b45647a7fdaa8507a8a73cfd13d0` | Final Payment Date | date | — |
| `63fb8038d8a5c5e284a571150ad4bba33f430679` | Costs Formula | double | — |
| `d1f880c8dcaf5205f7d51484cfc083d0636f9b6e` | Facebook Profile | varchar | — |

---

## Pipelines e Stages (referência)

| Pipeline ID | Nome |
|-------------|------|
| `16` | Sales Pipeline Smith & Adams |

| Stage ID | Nome |
|----------|------|
| `110` | Lead In |
| `111` | Contacted |

---

## Owners (referência)

| Owner ID | Nome / País |
|----------|-------------|
| `26395871` | India |
| `26395882` | Turkey (Inna Ianiuk) |
| `29048455` | Dubai / UAE / Taiwan / Hong Kong |
| `28045156` | US / UK |
| `29249359` | Default (outros países) |
