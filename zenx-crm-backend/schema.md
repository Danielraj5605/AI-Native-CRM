# ZenX CRM — Database Schema

## customer_profiles
- id UUID PRIMARY KEY
- external_id TEXT UNIQUE
- created_at TIMESTAMP
- updated_at TIMESTAMP

## customer_identities
- id UUID PRIMARY KEY
- profile_id UUID → customer_profiles.id
- channel TEXT (email, phone, whatsapp, sms, rcs)
- value TEXT
- is_primary BOOLEAN
- opted_in BOOLEAN
- opted_in_at TIMESTAMP

## customer_attributes
- id UUID PRIMARY KEY
- profile_id UUID → customer_profiles.id
- key TEXT
- value TEXT
- updated_at TIMESTAMP

## customer_events
- id UUID PRIMARY KEY
- profile_id UUID → customer_profiles.id
- event_type TEXT
- properties JSONB
- occurred_at TIMESTAMP
- source TEXT

## orders
- id UUID PRIMARY KEY
- profile_id UUID → customer_profiles.id
- event_id UUID → customer_events.id
- order_number TEXT
- total_amount NUMERIC
- currency TEXT
- line_items JSONB
- ordered_at TIMESTAMP

## segments
- id UUID PRIMARY KEY
- name TEXT
- description TEXT
- definition JSONB
- nl_query TEXT
- sql_query TEXT
- is_dynamic BOOLEAN
- last_count INTEGER
- last_computed TIMESTAMP
- created_at TIMESTAMP

## campaigns
- id UUID PRIMARY KEY
- name TEXT
- segment_id UUID → segments.id
- channel TEXT (whatsapp, sms, email, rcs)
- status TEXT (draft, sending, completed, failed)
- scheduled_at TIMESTAMP
- sent_at TIMESTAMP
- created_at TIMESTAMP

## campaign_variants
- id UUID PRIMARY KEY
- campaign_id UUID → campaigns.id
- variant_name TEXT
- message_template TEXT
- weight INTEGER
- ai_generated BOOLEAN

## campaign_sends
- id UUID PRIMARY KEY
- campaign_id UUID → campaigns.id
- variant_id UUID → campaign_variants.id
- profile_id UUID → customer_profiles.id
- channel_address TEXT
- message_sent TEXT
- status TEXT (pending, sent, delivered, failed)
- metadata JSONB
- sent_at TIMESTAMP
- provider_ref TEXT

## delivery_events
- id UUID PRIMARY KEY
- campaign_send_id UUID → campaign_sends.id
- event_type TEXT (queued, sent, delivered, failed, opened, read, clicked, converted)
- metadata JSONB
- occurred_at TIMESTAMP

## campaign_stats
- campaign_id UUID PRIMARY KEY → campaigns.id
- total_sent INTEGER
- total_delivered INTEGER
- total_failed INTEGER
- total_opened INTEGER
- total_read INTEGER
- total_clicked INTEGER
- total_converted INTEGER
- updated_at TIMESTAMP