# Sheet schema (for humans and AIs)

You are updating the Google Sheet behind the India & Sri Lanka travel app of Elias and Sunny. **Only use the columns and values below. Never rename or reorder columns. Never delete rows unless asked.** Dates are `YYYY-MM-DD`, times `HH:MM` (24h, local time). Leave unknown cells empty – don't invent data.

## Tab `Days` – one row per trip day (29 Nov – 22 Dec 2026)
| column | meaning | example |
|---|---|---|
| date | the day | 2026-12-03 |
| country | `India` or `Sri Lanka` | India |
| location | city/area where you are that day | Jaipur |
| title | short headline for the day | Amber Fort & old city |

## Tab `Items` – one row per stay, transport, activity, task
| column | meaning | example |
|---|---|---|
| id | unique short id, never reuse | `stay-jaipur` |
| date | start date (empty for undated tasks like visas) | 2026-12-02 |
| end_date | stays: **check-out date**; multi-day items: last day | 2026-12-04 |
| time | start time (stay: check-in) | 14:00 |
| end_time | end time (stay: check-out; flight: arrival) | 11:00 |
| type | `stay` · `flight` · `train` · `transfer` · `activity` · `food` · `admin` | stay |
| title | short name | Hotel Pearl Palace |
| place | address or place name Google Maps understands | Pearl Palace, Jaipur |
| lat / lng | coordinates (decimal), optional but best for the map | 26.9196 / 75.7953 |
| maps_url | Google Maps link, optional | https://maps.app.goo.gl/… |
| phone | with country code | +91 141 237 3700 |
| notes | free text shown in day view | Ask for rooftop table |
| status | `booked` · `open` · `not needed` | booked |
| ref | booking / confirmation number | ABC123 |
| provider | Booking.com, Airline, driver name … | Booking.com |
| price | number only, total for both people | 8400 |
| currency | `CHF` · `EUR` · `USD` · `INR` · `LKR` | INR |
| paid_by | `Elias` · `Sunny` · `Split` | Elias |
| payment | `paid` · `pay on site` | paid |
| cancel_until | last free-cancellation date | 2026-11-25 |
| doc_link | link to confirmation PDF (Drive/OneDrive) | https://… |

Rules: a stay covers every night from `date` up to (not including) `end_date`. A flight goes on its departure date; put the route in `title` ("DEL → CMB"). Visa, insurance etc. are `admin` items without date. When something gets booked: set `status`=booked and fill ref/price/currency/paid_by/payment. When a "pay on site" bill is settled: set `payment`=paid.

## Tab `Places` – saved Google Maps places (ideas, shown on map)
`name | list | lat | lng | maps_url | note`

## Tab `Settings` – key/value
`traveler_1`=Elias, `traveler_2`=Sunny, `home_currency`=CHF, `rate_EUR`/`rate_USD`/`rate_INR`/`rate_LKR` = **units of that currency per 1 CHF** (e.g. rate_INR = 105).

## Prompt template
> Here is my travel sheet schema (SCHEMA.md). Update the sheet with this info: «…». Show me the rows you change before writing.
