
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "admin_notes": {
                  Row: {
                    "author_id": string | null,"created_at": string,"entity_id": string,"entity_type": string,"id": string,"note": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"created_at"?: string,"entity_id": string,"entity_type": string,"id"?: string,"note": string
                  }
                  Update: {
                    "author_id"?: string | null,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"id"?: string,"note"?: string
                  }
                  Relationships: [
                    
                  ]
                },"analytics_events": {
                  Row: {
                    "created_at": string,"event_type": string,"id": number,"path": string | null,"product_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event_type": string,"id"?: never,"path"?: string | null,"product_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"event_type"?: string,"id"?: never,"path"?: string | null,"product_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "analytics_events_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_email": string | null,"actor_id": string | null,"changes": Json | null,"created_at": string,"id": number,"record_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_email"?: string | null,"actor_id"?: string | null,"changes"?: Json | null,"created_at"?: string,"id"?: never,"record_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_email"?: string | null,"actor_id"?: string | null,"changes"?: Json | null,"created_at"?: string,"id"?: never,"record_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"availability_alerts": {
                  Row: {
                    "created_at": string,"id": string,"notified_at": string | null,"product_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"notified_at"?: string | null,"product_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"notified_at"?: string | null,"product_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_alerts_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"brands": {
                  Row: {
                    "created_at": string,"id": number,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"name": string,"slug": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "active": boolean,"created_at": string,"description": string | null,"id": number,"kind": string,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"description"?: string | null,"id"?: never,"kind"?: string,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"description"?: string | null,"id"?: never,"kind"?: string,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"contact_messages": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"message": string,"name": string,"phone": string | null,"status": string,"subject": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"message": string,"name": string,"phone"?: string | null,"status"?: string,"subject"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"message"?: string,"name"?: string,"phone"?: string | null,"status"?: string,"subject"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"data_requests": {
                  Row: {
                    "admin_response": string | null,"completed_at": string | null,"created_at": string,"id": string,"reason": string | null,"request_type": string,"status": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_response"?: string | null,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"reason"?: string | null,"request_type": string,"status"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "admin_response"?: string | null,"completed_at"?: string | null,"created_at"?: string,"id"?: string,"reason"?: string | null,"request_type"?: string,"status"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"notifications": {
                  Row: {
                    "audience": string,"body": string,"created_at": string,"email_error": string | null,"email_status": string,"emailed_at": string | null,"id": string,"link": string | null,"read_at": string | null,"title": string,"type": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "audience": string,"body"?: string,"created_at"?: string,"email_error"?: string | null,"email_status"?: string,"emailed_at"?: string | null,"id"?: string,"link"?: string | null,"read_at"?: string | null,"title": string,"type": string,"user_id"?: string | null
                  }
                  Update: {
                    "audience"?: string,"body"?: string,"created_at"?: string,"email_error"?: string | null,"email_status"?: string,"emailed_at"?: string | null,"id"?: string,"link"?: string | null,"read_at"?: string | null,"title"?: string,"type"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"product_images": {
                  Row: {
                    "alt_text": string,"created_at": string,"height": number | null,"id": string,"product_id": string,"sort_order": number,"storage_path": string,"thumb_path": string | null,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_text"?: string,"created_at"?: string,"height"?: number | null,"id"?: string,"product_id": string,"sort_order"?: number,"storage_path": string,"thumb_path"?: string | null,"width"?: number | null
                  }
                  Update: {
                    "alt_text"?: string,"created_at"?: string,"height"?: number | null,"id"?: string,"product_id"?: string,"sort_order"?: number,"storage_path"?: string,"thumb_path"?: string | null,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_images_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"product_private": {
                  Row: {
                    "acquired_from": string | null,"acquisition_cost": number | null,"internal_notes": string | null,"product_id": string,"serial_number": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acquired_from"?: string | null,"acquisition_cost"?: number | null,"internal_notes"?: string | null,"product_id": string,"serial_number"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "acquired_from"?: string | null,"acquisition_cost"?: number | null,"internal_notes"?: string | null,"product_id"?: string,"serial_number"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_private_product_id_fkey"
      columns: ["product_id"]
isOneToOne: true
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "brand_id": number | null,"category_id": number,"compare_at_price": number | null,"condition": string,"created_at": string,"defects": string,"description": string,"featured": boolean,"history": string,"id": string,"is_demo": boolean,"model": string | null,"price": number,"published_at": string | null,"quantity": number,"reserved_until": string | null,"slug": string,"sold_at": string | null,"status": string,"title": string,"updated_at": string,"year_made": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brand_id"?: number | null,"category_id": number,"compare_at_price"?: number | null,"condition": string,"created_at"?: string,"defects"?: string,"description"?: string,"featured"?: boolean,"history"?: string,"id"?: string,"is_demo"?: boolean,"model"?: string | null,"price": number,"published_at"?: string | null,"quantity"?: number,"reserved_until"?: string | null,"slug": string,"sold_at"?: string | null,"status"?: string,"title": string,"updated_at"?: string,"year_made"?: string | null
                  }
                  Update: {
                    "brand_id"?: number | null,"category_id"?: number,"compare_at_price"?: number | null,"condition"?: string,"created_at"?: string,"defects"?: string,"description"?: string,"featured"?: boolean,"history"?: string,"id"?: string,"is_demo"?: boolean,"model"?: string | null,"price"?: number,"published_at"?: string | null,"quantity"?: number,"reserved_until"?: string | null,"slug"?: string,"sold_at"?: string | null,"status"?: string,"title"?: string,"updated_at"?: string,"year_made"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "anonymised_at": string | null,"created_at": string,"email": string | null,"full_name": string | null,"id": string,"phone": string | null,"preferred_contact": string,"role": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anonymised_at"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"phone"?: string | null,"preferred_contact"?: string,"role"?: string,"updated_at"?: string
                  }
                  Update: {
                    "anonymised_at"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"phone"?: string | null,"preferred_contact"?: string,"role"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"purchase_request_items": {
                  Row: {
                    "id": string,"price_snapshot": number,"product_id": string | null,"quantity": number,"request_id": string,"title_snapshot": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"price_snapshot": number,"product_id"?: string | null,"quantity"?: number,"request_id": string,"title_snapshot": string
                  }
                  Update: {
                    "id"?: string,"price_snapshot"?: number,"product_id"?: string | null,"quantity"?: number,"request_id"?: string,"title_snapshot"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "purchase_request_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_request_items_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "purchase_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"purchase_requests": {
                  Row: {
                    "contact_email": string | null,"contact_name": string,"contact_phone": string | null,"created_at": string,"customer_message": string | null,"id": string,"message": string,"preferred_contact": string,"reference": string,"status": string,"total_estimate": number,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_email"?: string | null,"contact_name": string,"contact_phone"?: string | null,"created_at"?: string,"customer_message"?: string | null,"id"?: string,"message"?: string,"preferred_contact"?: string,"reference"?: string,"status"?: string,"total_estimate"?: number,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "contact_email"?: string | null,"contact_name"?: string,"contact_phone"?: string | null,"created_at"?: string,"customer_message"?: string | null,"id"?: string,"message"?: string,"preferred_contact"?: string,"reference"?: string,"status"?: string,"total_estimate"?: number,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"repair_bookings": {
                  Row: {
                    "appointment_at": string | null,"brand": string,"contact_email": string | null,"contact_name": string,"contact_phone": string | null,"created_at": string,"customer_message": string | null,"guitar_type": string,"id": string,"model": string,"notes": string,"preferred_contact": string,"preferred_date": string | null,"problem_description": string,"quote_amount": number | null,"quote_message": string | null,"quote_status": string,"reference": string,"requested_services": (string)[],"status": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "appointment_at"?: string | null,"brand"?: string,"contact_email"?: string | null,"contact_name": string,"contact_phone"?: string | null,"created_at"?: string,"customer_message"?: string | null,"guitar_type": string,"id"?: string,"model"?: string,"notes"?: string,"preferred_contact"?: string,"preferred_date"?: string | null,"problem_description": string,"quote_amount"?: number | null,"quote_message"?: string | null,"quote_status"?: string,"reference"?: string,"requested_services"?: (string)[],"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "appointment_at"?: string | null,"brand"?: string,"contact_email"?: string | null,"contact_name"?: string,"contact_phone"?: string | null,"created_at"?: string,"customer_message"?: string | null,"guitar_type"?: string,"id"?: string,"model"?: string,"notes"?: string,"preferred_contact"?: string,"preferred_date"?: string | null,"problem_description"?: string,"quote_amount"?: number | null,"quote_message"?: string | null,"quote_status"?: string,"reference"?: string,"requested_services"?: (string)[],"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"repair_images": {
                  Row: {
                    "created_at": string,"id": string,"repair_id": string,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"repair_id": string,"storage_path": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"repair_id"?: string,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "repair_images_repair_id_fkey"
      columns: ["repair_id"]
isOneToOne: false
      referencedRelation: "repair_bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"reservations": {
                  Row: {
                    "contact_email": string | null,"contact_name": string,"contact_phone": string | null,"created_at": string,"customer_message": string | null,"decided_at": string | null,"expires_at": string | null,"id": string,"message": string,"preferred_contact": string,"price_snapshot": number,"product_id": string | null,"product_title_snapshot": string,"reference": string,"status": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "contact_email"?: string | null,"contact_name": string,"contact_phone"?: string | null,"created_at"?: string,"customer_message"?: string | null,"decided_at"?: string | null,"expires_at"?: string | null,"id"?: string,"message"?: string,"preferred_contact"?: string,"price_snapshot": number,"product_id"?: string | null,"product_title_snapshot": string,"reference"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "contact_email"?: string | null,"contact_name"?: string,"contact_phone"?: string | null,"created_at"?: string,"customer_message"?: string | null,"decided_at"?: string | null,"expires_at"?: string | null,"id"?: string,"message"?: string,"preferred_contact"?: string,"price_snapshot"?: number,"product_id"?: string | null,"product_title_snapshot"?: string,"reference"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reservations_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"review_reports": {
                  Row: {
                    "created_at": string,"id": string,"reason": string,"reporter_id": string | null,"resolved": boolean,"review_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"reason": string,"reporter_id"?: string | null,"resolved"?: boolean,"review_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"reason"?: string,"reporter_id"?: string | null,"resolved"?: boolean,"review_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_reports_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "public_reviews"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "review_reports_review_id_fkey"
      columns: ["review_id"]
isOneToOne: false
      referencedRelation: "reviews"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "body": string,"created_at": string,"display_name": string,"id": string,"moderated_at": string | null,"moderated_by": string | null,"rating": number,"rejection_reason": string | null,"status": string,"title": string,"updated_at": string,"user_id": string | null,"verified_purchase": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"display_name": string,"id"?: string,"moderated_at"?: string | null,"moderated_by"?: string | null,"rating": number,"rejection_reason"?: string | null,"status"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string | null,"verified_purchase"?: boolean
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"display_name"?: string,"id"?: string,"moderated_at"?: string | null,"moderated_by"?: string | null,"rating"?: number,"rejection_reason"?: string | null,"status"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string | null,"verified_purchase"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"seller_offers": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"message": string,"responded_at": string | null,"status": string,"submission_id": string,"valid_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"message"?: string,"responded_at"?: string | null,"status"?: string,"submission_id": string,"valid_until"?: string | null
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"message"?: string,"responded_at"?: string | null,"status"?: string,"submission_id"?: string,"valid_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "seller_offers_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "seller_submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"seller_submission_images": {
                  Row: {
                    "created_at": string,"id": string,"storage_path": string,"submission_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"storage_path": string,"submission_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"storage_path"?: string,"submission_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "seller_submission_images_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "seller_submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"seller_submissions": {
                  Row: {
                    "asking_price": number | null,"brand": string,"category_id": number | null,"condition": string,"consent_at": string,"contact_email": string | null,"contact_name": string,"contact_phone": string | null,"created_at": string,"customer_message": string | null,"defects": string,"id": string,"is_working": boolean,"location": string | null,"model": string,"notes": string,"preferred_contact": string,"privacy_consent": boolean,"reference": string,"status": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "asking_price"?: number | null,"brand": string,"category_id"?: number | null,"condition": string,"consent_at"?: string,"contact_email"?: string | null,"contact_name": string,"contact_phone"?: string | null,"created_at"?: string,"customer_message"?: string | null,"defects"?: string,"id"?: string,"is_working": boolean,"location"?: string | null,"model": string,"notes"?: string,"preferred_contact"?: string,"privacy_consent": boolean,"reference"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "asking_price"?: number | null,"brand"?: string,"category_id"?: number | null,"condition"?: string,"consent_at"?: string,"contact_email"?: string | null,"contact_name"?: string,"contact_phone"?: string | null,"created_at"?: string,"customer_message"?: string | null,"defects"?: string,"id"?: string,"is_working"?: boolean,"location"?: string | null,"model"?: string,"notes"?: string,"preferred_contact"?: string,"privacy_consent"?: boolean,"reference"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "seller_submissions_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"site_settings": {
                  Row: {
                    "is_public": boolean,"key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "is_public"?: boolean,"key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "is_public"?: boolean,"key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"status_events": {
                  Row: {
                    "changed_by": string | null,"created_at": string,"entity_id": string,"entity_type": string,"from_status": string | null,"id": number,"note": string | null,"to_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_by"?: string | null,"created_at"?: string,"entity_id": string,"entity_type": string,"from_status"?: string | null,"id"?: never,"note"?: string | null,"to_status": string
                  }
                  Update: {
                    "changed_by"?: string | null,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"from_status"?: string | null,"id"?: never,"note"?: string | null,"to_status"?: string
                  }
                  Relationships: [
                    
                  ]
                },"wishlists": {
                  Row: {
                    "created_at": string,"product_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"product_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"product_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wishlists_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "public_reviews": {
                  Row: {
                    "body": string | null,"created_at": string | null,"display_name": string | null,"id": string | null,"rating": number | null,"title": string | null,"verified_purchase": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                           "body"?: string | null,"created_at"?: string | null,"display_name"?: string | null,"id"?: string | null,"rating"?: number | null,"title"?: string | null,"verified_purchase"?: boolean | null
                         }
                        Update: {
                           "body"?: string | null,"created_at"?: string | null,"display_name"?: string | null,"id"?: string | null,"rating"?: number | null,"title"?: string | null,"verified_purchase"?: boolean | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "admin_anonymise_user":
{ Args: { "p_response"?: string,"p_user_id": string }; Returns: undefined
                           },
"admin_load_demo_data":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"admin_overview":
{ Args: { "p_days"?: number }; Returns: Json
                           },
"admin_remove_demo_data":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"approve_reservation":
{ Args: { "p_hold_days": number,"p_id": string,"p_message": string }; Returns: undefined
                           },
"cancel_purchase_request":
{ Args: { "p_id": string }; Returns: undefined
                           },
"cancel_repair_booking":
{ Args: { "p_id": string }; Returns: undefined
                           },
"cancel_reservation":
{ Args: { "p_id": string }; Returns: undefined
                           },
"decline_reservation":
{ Args: { "p_id": string,"p_message": string }; Returns: undefined
                           },
"demote_admin":
{ Args: { "p_email": string }; Returns: string
                           },
"expire_stale_records":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"mark_notifications_read":
{ Args: { "p_ids"?: (string)[] }; Returns: undefined
                           },
"promote_to_admin":
{ Args: { "p_email": string }; Returns: string
                           },
"reply_to_repair_booking":
{ Args: { "p_id": string,"p_message": string }; Returns: undefined
                           },
"reply_to_seller_submission":
{ Args: { "p_id": string,"p_message": string }; Returns: undefined
                           },
"request_reservation":
{ Args: { "p_contact_email": string,"p_contact_name": string,"p_contact_phone": string,"p_message": string,"p_preferred_contact": string,"p_product_id": string }; Returns: {
              "id": string,"reference": string
            }[]
                           },
"respond_to_offer":
{ Args: { "p_accept": boolean,"p_message"?: string,"p_offer_id": string }; Returns: undefined
                           },
"respond_to_repair_quote":
{ Args: { "p_accept": boolean,"p_id": string }; Returns: undefined
                           },
"search_products":
{ Args: { "p_availability"?: string,"p_brand"?: string,"p_category"?: string,"p_conditions"?: (string)[],"p_featured_only"?: boolean,"p_limit"?: number,"p_max"?: number,"p_min"?: number,"p_offers_only"?: boolean,"p_offset"?: number,"p_q"?: string,"p_sort"?: string }; Returns: {
              "brand_name": string,"brand_slug": string,"category_name": string,"category_slug": string,"compare_at_price": number,"condition": string,"created_at": string,"featured": boolean,"id": string,"image_alt": string,"image_path": string,"is_demo": boolean,"model": string,"price": number,"quantity": number,"slug": string,"status": string,"title": string,"total_count": number
            }[]
                           },
"submit_contact_message":
{ Args: { "p_email": string,"p_message": string,"p_name": string,"p_phone": string,"p_subject": string }; Returns: undefined
                           },
"submit_purchase_request":
{ Args: { "p_contact_email": string,"p_contact_name": string,"p_contact_phone": string,"p_items": Json,"p_message": string,"p_preferred_contact": string }; Returns: {
              "id": string,"reference": string
            }[]
                           },
"track_event":
{ Args: { "p_path"?: string,"p_product_id"?: string,"p_type": string }; Returns: undefined
                           },
"withdraw_seller_submission":
{ Args: { "p_id": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            
          }
        }
} as const
