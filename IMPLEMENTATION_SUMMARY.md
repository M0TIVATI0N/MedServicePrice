# Implementation Summary

## Data Collection Module (parsers/dataCollector.ts)

### Features Implemented:

1. **Multi-format Document Parsing**
   - HTML pages (using cheerio)
   - PDF documents (using pdf-parse)
   - DOCX files (using mammoth)
   - Excel spreadsheets (using xlsx)

2. **Deduplication Prevention**
   - SHA-256 hash generation based on: clinic_id + source_url + service_name + price
   - Hash stored in `raw_hash` field for MongoDB unique indexing
   - Prevents duplicate records when re-running parser

3. **Error Logging** (parsers/errorLogger.ts)
   - Structured error logging with levels (INFO, WARNING, ERROR, CRITICAL)
   - Source tracking for each error
   - Context information storage
   - Statistics and filtering capabilities
   - API endpoints: `/parse-errors`, `/parse-errors/stats`

4. **Raw Data Storage**
   - Raw parsed data stored separately in `/data/raw/` directory
   - JSON format with timestamps
   - Includes metadata and original content

5. **Manual & Scheduled Parsing**
   - Manual parsing via API: `POST /parse-document`
   - Scheduled parsing support via cron endpoint: `POST /check-price-changes`
   - Existing parser endpoint: `POST /parse`

## New Features

### 1. Price Change Subscriptions
- **Model**: `PriceSubscription` in MongoDB
- **API Endpoints**:
  - `POST /subscriptions` - Create subscription
  - `GET /subscriptions/:userEmail` - Get user subscriptions
  - `DELETE /subscriptions/:subscriptionId` - Cancel subscription
  - `POST /check-price-changes` - Check and notify (for cron)

### 2. Clinic Comparison
- **API Endpoint**: `GET /compare/:serviceId?clinics=id1,id2,id3`
- Returns comparison table with:
  - Price statistics (min, max, average, difference)
  - Clinic listings sorted by price
  - Deviation from average percentage
  - Cheapest/most expensive markers

### 3. Price History
- **Enhanced API Endpoints**:
  - `GET /history` - General history with filters
  - `GET /history/:clinicId/:serviceId` - Detailed history for specific clinic/service
- Stores all price changes in `price_history` collection

## Database Schema Updates

### New Collections:
1. `price_subscriptions` - User subscriptions for price alerts
2. `raw_records` - Already existed, now with proper raw_hash deduplication
3. `offers` - Normalized clinic service offers
4. `price_history` - Historical price tracking

### Key Indexes:
- Unique index on `raw_hash` prevents duplicates
- Compound indexes for efficient queries
- Subscription indexes for user lookups

## File Structure

```
backend/src/
├── parsers/
│   ├── dataCollector.ts    # New: Multi-format document parser
│   ├── errorLogger.ts      # New: Error logging system
│   ├── index.ts            # Parser aggregation
│   ├── kdlParser.ts        # Existing KDL parser
│   ├── doqParser.ts        # Existing DOQ parser
│   └── documentParser.ts   # Existing document utilities
├── db.ts                   # Updated: Added PriceSubscription model
├── models.ts               # Updated: Added PriceSubscription interface
├── parser.ts               # Updated: Added subscription & comparison functions
├── routes.ts               # Updated: Added new API endpoints
└── ...
```

## API Usage Examples

### Subscribe to Price Changes
```bash
curl -X POST http://localhost:4000/api/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "user@example.com",
    "clinicId": "kdl-almaty",
    "clinicName": "KDL",
    "serviceId": "00000000-0000-0000-0000-000000000001",
    "serviceName": "Общий анализ крови (ОАК)",
    "targetPrice": 5000
  }'
```

### Compare Clinics
```bash
curl http://localhost:4000/api/compare/00000000-0000-0000-0000-000000000001?clinics=kdl-almaty,kdl-astana
```

### Get Price History
```bash
curl http://localhost:4000/api/history/kdl-almaty/00000000-0000-0000-0000-000000000001
```

### Manual Document Parsing
```bash
curl -X POST http://localhost:4000/api/parse-document \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://clinic.kz/prices.pdf",
    "clinicId": "clinic-123",
    "clinicName": "Medical Center",
    "city": "Almaty",
    "address": "Street 123",
    "phone": "+7 777 123 4567",
    "workingHours": "09:00-18:00"
  }'
```

### Check Parsing Errors
```bash
curl http://localhost:4000/api/parse-errors
curl http://localhost:4000/api/parse-errors/stats
curl http://localhost:4000/api/parse-errors?source=kdl
```

## Cron Job Setup Example

For scheduled price change checks (add to crontab):
```bash
# Check price changes every hour
0 * * * * curl -X POST http://localhost:4000/api/check-price-changes
```

## Dependencies Added

- `xlsx` - Excel file parsing
- `@types/xlsx` - TypeScript definitions
