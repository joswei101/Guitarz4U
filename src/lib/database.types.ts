
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
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
                    {
      foreignKeyName: "admin_notes_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"analytics_events": {
                  Row: {
                    "created_at": string,"event_name": string,"id": number,"path": string | null,"product_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event_name": string,"id"?: never,"path"?: string | null,"product_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"event_name"?: string,"id"?: never,"path"?: string | null,"product_id"?: string | null
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
                    "action": string,"actor_email": string | null,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"entity_id": string | null,"entity_type": string,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_email"?: string | null,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string | null,"entity_type": string,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor_email"?: string | null,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string | null,"entity_type"?: string,"id"?: never
                  }
                  Relationships: [
                    
                  ]
                },"availability_alerts": {
                  Row: {
                    "brand_id": number | null,"category_id": number | null,"created_at": string,"id": string,"is_active": boolean,"last_notified_at": string | null,"product_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brand_id"?: number | null,"category_id"?: number | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"last_notified_at"?: string | null,"product_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "brand_id"?: number | null,"category_id"?: number | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"last_notified_at"?: string | null,"product_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_alerts_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "availability_alerts_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "availability_alerts_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "availability_alerts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
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
                    "description": string | null,"id": number,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"id"?: never,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "description"?: string | null,"id"?: never,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"data_requests": {
                  Row: {
                    "completed_at": string | null,"created_at": string,"id": string,"reason": string | null,"request_type": Database["public"]['Enums']["data_request_type"],"status": Database["public"]['Enums']["data_request_status"],"user_email": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"created_at"?: string,"id"?: string,"reason"?: string | null,"request_type": Database["public"]['Enums']["data_request_type"],"status"?: Database["public"]['Enums']["data_request_status"],"user_email"?: string | null,"user_id"?: string | null
                  }
                  Update: {
                    "completed_at"?: string | null,"created_at"?: string,"id"?: string,"reason"?: string | null,"request_type"?: Database["public"]['Enums']["data_request_type"],"status"?: Database["public"]['Enums']["data_request_status"],"user_email"?: string | null,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "data_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"enquiries": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"message": string,"name": string,"phone": string | null,"product_id": string | null,"status": Database["public"]['Enums']["enquiry_status"],"subject": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"message": string,"name": string,"phone"?: string | null,"product_id"?: string | null,"status"?: Database["public"]['Enums']["enquiry_status"],"subject": string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"message"?: string,"name"?: string,"phone"?: string | null,"product_id"?: string | null,"status"?: Database["public"]['Enums']["enquiry_status"],"subject"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "enquiries_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enquiries_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"link": string | null,"read_at": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"created_at"?: string,"id"?: string,"link"?: string | null,"read_at"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"link"?: string | null,"read_at"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"product_images": {
                  Row: {
                    "alt_text": string | null,"created_at": string,"id": string,"product_id": string,"sort_order": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_text"?: string | null,"created_at"?: string,"id"?: string,"product_id": string,"sort_order"?: number,"storage_path": string
                  }
                  Update: {
                    "alt_text"?: string | null,"created_at"?: string,"id"?: string,"product_id"?: string,"sort_order"?: number,"storage_path"?: string
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
                    "acquisition_notes": string | null,"internal_notes": string | null,"product_id": string,"serial_number": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acquisition_notes"?: string | null,"internal_notes"?: string | null,"product_id": string,"serial_number"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "acquisition_notes"?: string | null,"internal_notes"?: string | null,"product_id"?: string,"serial_number"?: string | null,"updated_at"?: string
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
                    "brand_id": number | null,"category_id": number,"colour": string | null,"compare_at_price": number | null,"condition": Database["public"]['Enums']["product_condition"],"created_at": string,"defects": string,"description": string,"functional_status": Database["public"]['Enums']["functional_status"],"history": string,"id": string,"included_items": string,"is_demo": boolean,"is_featured": boolean,"model": string | null,"price": number,"published_at": string | null,"slug": string,"sold_at": string | null,"specifications": string,"status": Database["public"]['Enums']["product_status"],"title": string,"updated_at": string,"year_made": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brand_id"?: number | null,"category_id": number,"colour"?: string | null,"compare_at_price"?: number | null,"condition": Database["public"]['Enums']["product_condition"],"created_at"?: string,"defects"?: string,"description"?: string,"functional_status"?: Database["public"]['Enums']["functional_status"],"history"?: string,"id"?: string,"included_items"?: string,"is_demo"?: boolean,"is_featured"?: boolean,"model"?: string | null,"price": number,"published_at"?: string | null,"slug": string,"sold_at"?: string | null,"specifications"?: string,"status"?: Database["public"]['Enums']["product_status"],"title": string,"updated_at"?: string,"year_made"?: string | null
                  }
                  Update: {
                    "brand_id"?: number | null,"category_id"?: number,"colour"?: string | null,"compare_at_price"?: number | null,"condition"?: Database["public"]['Enums']["product_condition"],"created_at"?: string,"defects"?: string,"description"?: string,"functional_status"?: Database["public"]['Enums']["functional_status"],"history"?: string,"id"?: string,"included_items"?: string,"is_demo"?: boolean,"is_featured"?: boolean,"model"?: string | null,"price"?: number,"published_at"?: string | null,"slug"?: string,"sold_at"?: string | null,"specifications"?: string,"status"?: Database["public"]['Enums']["product_status"],"title"?: string,"updated_at"?: string,"year_made"?: string | null
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
                    "created_at": string,"email": string | null,"full_name": string | null,"id": string,"is_anonymised": boolean,"phone": string | null,"preferred_contact": Database["public"]['Enums']["contact_method"],"role": Database["public"]['Enums']["user_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"is_anonymised"?: boolean,"phone"?: string | null,"preferred_contact"?: Database["public"]['Enums']["contact_method"],"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"is_anonymised"?: boolean,"phone"?: string | null,"preferred_contact"?: Database["public"]['Enums']["contact_method"],"role"?: Database["public"]['Enums']["user_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"purchase_request_items": {
                  Row: {
                    "created_at": string,"id": string,"price_snapshot": number,"product_id": string | null,"request_id": string,"title_snapshot": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"price_snapshot": number,"product_id"?: string | null,"request_id": string,"title_snapshot": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"price_snapshot"?: number,"product_id"?: string | null,"request_id"?: string,"title_snapshot"?: string
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
                    "completed_at": string | null,"contact_email": string | null,"contact_name": string,"contact_phone": string | null,"created_at": string,"customer_message": string,"eft_instructions_sent_at": string | null,"estimated_total": number,"id": string,"payment_confirmed_at": string | null,"payment_confirmed_by": string | null,"preferred_contact": Database["public"]['Enums']["contact_method"],"reference": string,"status": Database["public"]['Enums']["purchase_status"],"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string | null,"contact_email"?: string | null,"contact_name": string,"contact_phone"?: string | null,"created_at"?: string,"customer_message"?: string,"eft_instructions_sent_at"?: string | null,"estimated_total"?: number,"id"?: string,"payment_confirmed_at"?: string | null,"payment_confirmed_by"?: string | null,"preferred_contact"?: Database["public"]['Enums']["contact_method"],"reference"?: string,"status"?: Database["public"]['Enums']["purchase_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "completed_at"?: string | null,"contact_email"?: string | null,"contact_name"?: string,"contact_phone"?: string | null,"created_at"?: string,"customer_message"?: string,"eft_instructions_sent_at"?: string | null,"estimated_total"?: number,"id"?: string,"payment_confirmed_at"?: string | null,"payment_confirmed_by"?: string | null,"preferred_contact"?: Database["public"]['Enums']["contact_method"],"reference"?: string,"status"?: Database["public"]['Enums']["purchase_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "purchase_requests_payment_confirmed_by_fkey"
      columns: ["payment_confirmed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "purchase_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "hits": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "hits"?: number,"key": string,"window_start"?: string
                  }
                  Update: {
                    "hits"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"repair_bookings": {
                  Row: {
                    "category_id": number | null,"contact_email": string | null,"contact_name": string,"contact_phone": string,"created_at": string,"customer_quote_response": string | null,"customer_quote_response_at": string | null,"guitar_brand": string,"guitar_model": string,"id": string,"notes": string,"preferred_contact": Database["public"]['Enums']["contact_method"],"preferred_date": string | null,"problem_description": string,"quote_amount": number | null,"quote_message": string | null,"quote_provided_at": string | null,"reference": string,"services": (string)[],"status": Database["public"]['Enums']["repair_status"],"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id"?: number | null,"contact_email"?: string | null,"contact_name": string,"contact_phone": string,"created_at"?: string,"customer_quote_response"?: string | null,"customer_quote_response_at"?: string | null,"guitar_brand": string,"guitar_model"?: string,"id"?: string,"notes"?: string,"preferred_contact"?: Database["public"]['Enums']["contact_method"],"preferred_date"?: string | null,"problem_description": string,"quote_amount"?: number | null,"quote_message"?: string | null,"quote_provided_at"?: string | null,"reference"?: string,"services"?: (string)[],"status"?: Database["public"]['Enums']["repair_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "category_id"?: number | null,"contact_email"?: string | null,"contact_name"?: string,"contact_phone"?: string,"created_at"?: string,"customer_quote_response"?: string | null,"customer_quote_response_at"?: string | null,"guitar_brand"?: string,"guitar_model"?: string,"id"?: string,"notes"?: string,"preferred_contact"?: Database["public"]['Enums']["contact_method"],"preferred_date"?: string | null,"problem_description"?: string,"quote_amount"?: number | null,"quote_message"?: string | null,"quote_provided_at"?: string | null,"reference"?: string,"services"?: (string)[],"status"?: Database["public"]['Enums']["repair_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "repair_bookings_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "repair_bookings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"repair_images": {
                  Row: {
                    "booking_id": string,"created_at": string,"id": string,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "booking_id": string,"created_at"?: string,"id"?: string,"storage_path": string
                  }
                  Update: {
                    "booking_id"?: string,"created_at"?: string,"id"?: string,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "repair_images_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "repair_bookings"
      referencedColumns: ["id"]
    }
                  ]
                },"reservations": {
                  Row: {
                    "approved_at": string | null,"contact_email": string | null,"contact_name": string,"contact_phone": string | null,"created_at": string,"customer_message": string,"expires_at": string | null,"id": string,"preferred_contact": Database["public"]['Enums']["contact_method"],"product_id": string | null,"product_title_snapshot": string,"reference": string,"status": Database["public"]['Enums']["reservation_status"],"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"contact_email"?: string | null,"contact_name": string,"contact_phone"?: string | null,"created_at"?: string,"customer_message"?: string,"expires_at"?: string | null,"id"?: string,"preferred_contact"?: Database["public"]['Enums']["contact_method"],"product_id"?: string | null,"product_title_snapshot": string,"reference"?: string,"status"?: Database["public"]['Enums']["reservation_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "approved_at"?: string | null,"contact_email"?: string | null,"contact_name"?: string,"contact_phone"?: string | null,"created_at"?: string,"customer_message"?: string,"expires_at"?: string | null,"id"?: string,"preferred_contact"?: Database["public"]['Enums']["contact_method"],"product_id"?: string | null,"product_title_snapshot"?: string,"reference"?: string,"status"?: Database["public"]['Enums']["reservation_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reservations_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reservations_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
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
      foreignKeyName: "review_reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
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
                    "body": string,"created_at": string,"id": string,"is_verified_buyer": boolean,"moderated_at": string | null,"moderated_by": string | null,"rating": number,"reviewer_name": string,"status": Database["public"]['Enums']["review_status"],"title": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"is_verified_buyer"?: boolean,"moderated_at"?: string | null,"moderated_by"?: string | null,"rating": number,"reviewer_name": string,"status"?: Database["public"]['Enums']["review_status"],"title": string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"is_verified_buyer"?: boolean,"moderated_at"?: string | null,"moderated_by"?: string | null,"rating"?: number,"reviewer_name"?: string,"status"?: Database["public"]['Enums']["review_status"],"title"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_moderated_by_fkey"
      columns: ["moderated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"seller_offers": {
                  Row: {
                    "amount": number,"created_at": string,"created_by": string | null,"id": string,"message": string,"responded_at": string | null,"status": Database["public"]['Enums']["offer_status"],"submission_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"message"?: string,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["offer_status"],"submission_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"created_by"?: string | null,"id"?: string,"message"?: string,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["offer_status"],"submission_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "seller_offers_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
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
                    "asking_price": number | null,"brand": string,"category_id": number,"condition": Database["public"]['Enums']["product_condition"],"contact_number": string,"created_at": string,"email": string | null,"fault_description": string,"id": string,"is_working": Database["public"]['Enums']["working_state"],"model": string,"not_loose_parts_confirmed": boolean,"notes": string,"privacy_acknowledged": boolean,"reference": string,"seller_name": string,"status": Database["public"]['Enums']["seller_status"],"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "asking_price"?: number | null,"brand": string,"category_id": number,"condition": Database["public"]['Enums']["product_condition"],"contact_number": string,"created_at"?: string,"email"?: string | null,"fault_description"?: string,"id"?: string,"is_working": Database["public"]['Enums']["working_state"],"model": string,"not_loose_parts_confirmed": boolean,"notes"?: string,"privacy_acknowledged": boolean,"reference"?: string,"seller_name": string,"status"?: Database["public"]['Enums']["seller_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "asking_price"?: number | null,"brand"?: string,"category_id"?: number,"condition"?: Database["public"]['Enums']["product_condition"],"contact_number"?: string,"created_at"?: string,"email"?: string | null,"fault_description"?: string,"id"?: string,"is_working"?: Database["public"]['Enums']["working_state"],"model"?: string,"not_loose_parts_confirmed"?: boolean,"notes"?: string,"privacy_acknowledged"?: boolean,"reference"?: string,"seller_name"?: string,"status"?: Database["public"]['Enums']["seller_status"],"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "seller_submissions_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "seller_submissions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"site_settings": {
                  Row: {
                    "is_public": boolean,"key": string,"updated_at": string,"updated_by": string | null,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "is_public"?: boolean,"key": string,"updated_at"?: string,"updated_by"?: string | null,"value": NonNullable<Json>
                  }
                  Update: {
                    "is_public"?: boolean,"key"?: string,"updated_at"?: string,"updated_by"?: string | null,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "site_settings_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"status_updates": {
                  Row: {
                    "created_at": string,"created_by": string | null,"entity_id": string,"entity_type": string,"id": string,"message": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"entity_id": string,"entity_type": string,"id"?: string,"message"?: string | null,"status": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"entity_id"?: string,"entity_type"?: string,"id"?: string,"message"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "status_updates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
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
    },{
      foreignKeyName: "wishlists_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_add_note":
{ Args: { "p_entity_id": string,"p_entity_type": string,"p_note": string }; Returns: undefined
                           },
"admin_anonymise_user":
{ Args: { "p_user_id": string }; Returns: undefined
                           },
"admin_dashboard_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_make_offer":
{ Args: { "p_amount": number,"p_message": string,"p_submission_id": string }; Returns: string
                           },
"admin_moderate_review":
{ Args: { "p_review_id": string,"p_status": Database["public"]['Enums']["review_status"] }; Returns: undefined
                           },
"admin_provide_repair_quote":
{ Args: { "p_amount": number,"p_booking_id": string,"p_message": string }; Returns: undefined
                           },
"admin_remove_demo_data":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"admin_set_purchase_status":
{ Args: { "p_admin_note": string,"p_customer_message": string,"p_request_id": string,"p_status": Database["public"]['Enums']["purchase_status"] }; Returns: undefined
                           },
"admin_set_repair_status":
{ Args: { "p_booking_id": string,"p_customer_message": string,"p_status": Database["public"]['Enums']["repair_status"] }; Returns: undefined
                           },
"admin_set_reservation_status":
{ Args: { "p_customer_message": string,"p_hold_days": number,"p_reservation_id": string,"p_status": Database["public"]['Enums']["reservation_status"] }; Returns: undefined
                           },
"admin_set_seller_status":
{ Args: { "p_customer_message": string,"p_status": Database["public"]['Enums']["seller_status"],"p_submission_id": string }; Returns: undefined
                           },
"cancel_purchase_request":
{ Args: { "p_request_id": string }; Returns: undefined
                           },
"cancel_repair_booking":
{ Args: { "p_booking_id": string }; Returns: undefined
                           },
"cancel_reservation":
{ Args: { "p_reservation_id": string }; Returns: undefined
                           },
"check_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: undefined
                           },
"expire_reservations":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"notify_admins":
{ Args: { "p_body": string,"p_link": string,"p_title": string }; Returns: undefined
                           },
"notify_user":
{ Args: { "p_body": string,"p_link": string,"p_title": string,"p_user_id": string }; Returns: undefined
                           },
"owns_entity":
{ Args: { "p_entity_id": string,"p_entity_type": string }; Returns: boolean
                           },
"record_status_update":
{ Args: { "p_entity_id": string,"p_entity_type": string,"p_link": string,"p_message": string,"p_status": string,"p_title": string,"p_user_id": string }; Returns: undefined
                           },
"release_product_if_free":
{ Args: { "p_product_id": string }; Returns: undefined
                           },
"report_review":
{ Args: { "p_reason": string,"p_review_id": string }; Returns: undefined
                           },
"request_data_action":
{ Args: { "p_reason": string,"p_type": Database["public"]['Enums']["data_request_type"] }; Returns: string
                           },
"request_reservation":
{ Args: { "p_contact_email": string,"p_contact_name": string,"p_contact_phone": string,"p_message": string,"p_preferred_contact": Database["public"]['Enums']["contact_method"],"p_product_id": string }; Returns: {
              "id": string,"reference": string
            }[]
                           },
"require_admin":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"require_user":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"respond_repair_quote":
{ Args: { "p_accept": boolean,"p_booking_id": string }; Returns: undefined
                           },
"respond_seller_offer":
{ Args: { "p_accept": boolean,"p_offer_id": string }; Returns: undefined
                           },
"status_label":
{ Args: { "p_status": string }; Returns: string
                           },
"submit_enquiry":
{ Args: { "p_email": string,"p_message": string,"p_name": string,"p_phone": string,"p_product_id": string,"p_subject": string }; Returns: string
                           },
"submit_purchase_request":
{ Args: { "p_contact_email": string,"p_contact_name": string,"p_contact_phone": string,"p_message": string,"p_preferred_contact": Database["public"]['Enums']["contact_method"],"p_product_ids": (string)[] }; Returns: {
              "id": string,"reference": string
            }[]
                           },
"submit_repair_booking":
{ Args: { "p_category_id": number,"p_contact_email": string,"p_contact_name": string,"p_contact_phone": string,"p_guitar_brand": string,"p_guitar_model": string,"p_image_paths": (string)[],"p_notes": string,"p_preferred_contact": Database["public"]['Enums']["contact_method"],"p_preferred_date": string,"p_problem_description": string,"p_services": (string)[] }; Returns: {
              "id": string,"reference": string
            }[]
                           },
"submit_review":
{ Args: { "p_body": string,"p_rating": number,"p_title": string }; Returns: string
                           },
"submit_seller_submission":
{ Args: { "p_asking_price": number,"p_brand": string,"p_category_id": number,"p_condition": Database["public"]['Enums']["product_condition"],"p_contact_number": string,"p_email": string,"p_fault_description": string,"p_image_paths": (string)[],"p_is_working": Database["public"]['Enums']["working_state"],"p_model": string,"p_not_loose_parts": boolean,"p_notes": string,"p_privacy_acknowledged": boolean,"p_seller_name": string }; Returns: {
              "id": string,"reference": string
            }[]
                           },
"track_event":
{ Args: { "p_event_name": string,"p_path": string,"p_product_id": string }; Returns: undefined
                           },
"withdraw_seller_submission":
{ Args: { "p_submission_id": string }; Returns: undefined
                           },
"write_audit":
{ Args: { "p_action": string,"p_details": Json,"p_entity_id": string,"p_entity_type": string }; Returns: undefined
                           }
          }
          Enums: {
            "contact_method": "whatsapp"|"email"|"phone","data_request_status": "pending"|"completed"|"rejected","data_request_type": "export"|"deletion","enquiry_status": "new"|"in_progress"|"closed","functional_status": "fully_working"|"minor_issues"|"needs_repair"|"not_working","offer_status": "pending"|"accepted"|"declined"|"withdrawn","product_condition": "mint"|"excellent"|"very_good"|"good"|"fair"|"project","product_status": "draft"|"published"|"reserved"|"sold"|"archived","purchase_status": "submitted"|"under_review"|"awaiting_customer"|"approved"|"awaiting_eft"|"payment_confirmed"|"ready_for_collection"|"completed"|"declined"|"cancelled","repair_status": "submitted"|"awaiting_review"|"awaiting_info"|"quote_provided"|"approved"|"in_progress"|"awaiting_collection"|"completed"|"cancelled","reservation_status": "requested"|"approved"|"declined"|"cancelled"|"expired"|"fulfilled","review_status": "pending"|"approved"|"rejected"|"removed","seller_status": "submitted"|"under_review"|"more_info_requested"|"offer_made"|"offer_accepted"|"offer_declined"|"approved"|"rejected"|"completed"|"withdrawn","user_role": "customer"|"admin","working_state": "yes"|"partially"|"no"|"unsure"
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "contact_method": ["whatsapp", "email", "phone"],"data_request_status": ["pending", "completed", "rejected"],"data_request_type": ["export", "deletion"],"enquiry_status": ["new", "in_progress", "closed"],"functional_status": ["fully_working", "minor_issues", "needs_repair", "not_working"],"offer_status": ["pending", "accepted", "declined", "withdrawn"],"product_condition": ["mint", "excellent", "very_good", "good", "fair", "project"],"product_status": ["draft", "published", "reserved", "sold", "archived"],"purchase_status": ["submitted", "under_review", "awaiting_customer", "approved", "awaiting_eft", "payment_confirmed", "ready_for_collection", "completed", "declined", "cancelled"],"repair_status": ["submitted", "awaiting_review", "awaiting_info", "quote_provided", "approved", "in_progress", "awaiting_collection", "completed", "cancelled"],"reservation_status": ["requested", "approved", "declined", "cancelled", "expired", "fulfilled"],"review_status": ["pending", "approved", "rejected", "removed"],"seller_status": ["submitted", "under_review", "more_info_requested", "offer_made", "offer_accepted", "offer_declined", "approved", "rejected", "completed", "withdrawn"],"user_role": ["customer", "admin"],"working_state": ["yes", "partially", "no", "unsure"]
          }
        }
} as const
