
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
            "audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"changes": Json | null,"created_at": string,"id": number,"record_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"changes"?: Json | null,"created_at"?: string,"id"?: never,"record_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"changes"?: Json | null,"created_at"?: string,"id"?: never,"record_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"email_outbox": {
                  Row: {
                    "attempts": number,"body_text": string,"created_at": string,"dedupe_key": string | null,"error": string | null,"id": string,"related_id": string | null,"related_type": string | null,"sent_at": string | null,"status": string,"subject": string,"to_email": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"body_text": string,"created_at"?: string,"dedupe_key"?: string | null,"error"?: string | null,"id"?: string,"related_id"?: string | null,"related_type"?: string | null,"sent_at"?: string | null,"status"?: string,"subject": string,"to_email": string
                  }
                  Update: {
                    "attempts"?: number,"body_text"?: string,"created_at"?: string,"dedupe_key"?: string | null,"error"?: string | null,"id"?: string,"related_id"?: string | null,"related_type"?: string | null,"sent_at"?: string | null,"status"?: string,"subject"?: string,"to_email"?: string
                  }
                  Relationships: [
                    
                  ]
                },"enquiries": {
                  Row: {
                    "admin_notes": string,"created_at": string,"email": string,"id": string,"message": string,"name": string,"phone": string | null,"preferred_contact": string,"ref": string,"status": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_notes"?: string,"created_at"?: string,"email": string,"id"?: string,"message"?: string,"name": string,"phone"?: string | null,"preferred_contact"?: string,"ref"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "admin_notes"?: string,"created_at"?: string,"email"?: string,"id"?: string,"message"?: string,"name"?: string,"phone"?: string | null,"preferred_contact"?: string,"ref"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"enquiry_items": {
                  Row: {
                    "enquiry_id": string,"id": string,"price_at_enquiry": number,"product_id": string | null,"product_label": string,"status_at_enquiry": string
                  }
                  ComputedFields: never
                  Insert: {
                    "enquiry_id": string,"id"?: string,"price_at_enquiry": number,"product_id"?: string | null,"product_label": string,"status_at_enquiry": string
                  }
                  Update: {
                    "enquiry_id"?: string,"id"?: string,"price_at_enquiry"?: number,"product_id"?: string | null,"product_label"?: string,"status_at_enquiry"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "enquiry_items_enquiry_id_fkey"
      columns: ["enquiry_id"]
isOneToOne: false
      referencedRelation: "enquiries"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "enquiry_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"faqs": {
                  Row: {
                    "answer": string,"created_at": string,"id": string,"is_published": boolean,"question": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"question": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "answer"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"question"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"messages": {
                  Row: {
                    "admin_notes": string,"body": string,"created_at": string,"email": string,"id": string,"kind": string,"name": string,"phone": string | null,"product_id": string | null,"status": string,"subject": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_notes"?: string,"body": string,"created_at"?: string,"email": string,"id"?: string,"kind"?: string,"name": string,"phone"?: string | null,"product_id"?: string | null,"status"?: string,"subject"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "admin_notes"?: string,"body"?: string,"created_at"?: string,"email"?: string,"id"?: string,"kind"?: string,"name"?: string,"phone"?: string | null,"product_id"?: string | null,"status"?: string,"subject"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "audience": string,"body": string,"created_at": string,"dedupe_key": string | null,"id": string,"link": string | null,"read_at": string | null,"staff_perm": string | null,"title": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "audience": string,"body"?: string,"created_at"?: string,"dedupe_key"?: string | null,"id"?: string,"link"?: string | null,"read_at"?: string | null,"staff_perm"?: string | null,"title": string,"user_id"?: string | null
                  }
                  Update: {
                    "audience"?: string,"body"?: string,"created_at"?: string,"dedupe_key"?: string | null,"id"?: string,"link"?: string | null,"read_at"?: string | null,"staff_perm"?: string | null,"title"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"offers": {
                  Row: {
                    "admin_notes": string,"amount": number,"counter_amount": number | null,"created_at": string,"email": string,"id": string,"message": string,"name": string,"phone": string | null,"product_id": string,"ref": string,"status": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_notes"?: string,"amount": number,"counter_amount"?: number | null,"created_at"?: string,"email": string,"id"?: string,"message"?: string,"name": string,"phone"?: string | null,"product_id": string,"ref"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "admin_notes"?: string,"amount"?: number,"counter_amount"?: number | null,"created_at"?: string,"email"?: string,"id"?: string,"message"?: string,"name"?: string,"phone"?: string | null,"product_id"?: string,"ref"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "offers_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"page_views": {
                  Row: {
                    "day": string,"path": string,"views": number
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"path": string,"views"?: number
                  }
                  Update: {
                    "day"?: string,"path"?: string,"views"?: number
                  }
                  Relationships: [
                    
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"created_at": string,"customer_id": string | null,"entity_id": string,"entity_type": string,"id": string,"method": string,"received_on": string,"recorded_by": string | null,"reference_note": string,"verified_confirmation": boolean,"void_reason": string | null,"voided": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"customer_id"?: string | null,"entity_id": string,"entity_type": string,"id"?: string,"method": string,"received_on": string,"recorded_by"?: string | null,"reference_note"?: string,"verified_confirmation": boolean,"void_reason"?: string | null,"voided"?: boolean
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"customer_id"?: string | null,"entity_id"?: string,"entity_type"?: string,"id"?: string,"method"?: string,"received_on"?: string,"recorded_by"?: string | null,"reference_note"?: string,"verified_confirmation"?: boolean,"void_reason"?: string | null,"voided"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"product_images": {
                  Row: {
                    "alt": string,"created_at": string,"height": number | null,"id": string,"path": string,"product_id": string,"sort_order": number,"thumb_path": string | null,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alt"?: string,"created_at"?: string,"height"?: number | null,"id"?: string,"path": string,"product_id": string,"sort_order"?: number,"thumb_path"?: string | null,"width"?: number | null
                  }
                  Update: {
                    "alt"?: string,"created_at"?: string,"height"?: number | null,"id"?: string,"path"?: string,"product_id"?: string,"sort_order"?: number,"thumb_path"?: string | null,"width"?: number | null
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
                    "acquired_from": string | null,"acquisition_cost": number | null,"internal_notes": string,"product_id": string,"serial_number": string | null,"sold_price": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acquired_from"?: string | null,"acquisition_cost"?: number | null,"internal_notes"?: string,"product_id": string,"serial_number"?: string | null,"sold_price"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "acquired_from"?: string | null,"acquisition_cost"?: number | null,"internal_notes"?: string,"product_id"?: string,"serial_number"?: string | null,"sold_price"?: number | null,"updated_at"?: string
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
                },"product_views": {
                  Row: {
                    "day": string,"product_id": string,"views": number
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"product_id": string,"views"?: number
                  }
                  Update: {
                    "day"?: string,"product_id"?: string,"views"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_views_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "accessories": string,"brand": string,"category": string,"condition": string,"created_at": string,"created_by": string | null,"defects": string,"description": string,"description_approved": boolean,"id": string,"is_featured": boolean,"is_new_arrival": boolean,"model": string,"price": number,"provenance": string,"public_serial": string | null,"published_at": string | null,"ref": string,"search": unknown,"slug": string,"sold_at": string | null,"status": string,"updated_at": string,"year_made": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accessories"?: string,"brand": string,"category": string,"condition": string,"created_at"?: string,"created_by"?: string | null,"defects"?: string,"description"?: string,"description_approved"?: boolean,"id"?: string,"is_featured"?: boolean,"is_new_arrival"?: boolean,"model": string,"price": number,"provenance"?: string,"public_serial"?: string | null,"published_at"?: string | null,"ref"?: string,"search"?: never,"slug": string,"sold_at"?: string | null,"status"?: string,"updated_at"?: string,"year_made"?: string | null
                  }
                  Update: {
                    "accessories"?: string,"brand"?: string,"category"?: string,"condition"?: string,"created_at"?: string,"created_by"?: string | null,"defects"?: string,"description"?: string,"description_approved"?: boolean,"id"?: string,"is_featured"?: boolean,"is_new_arrival"?: boolean,"model"?: string,"price"?: number,"provenance"?: string,"public_serial"?: string | null,"published_at"?: string | null,"ref"?: string,"search"?: never,"slug"?: string,"sold_at"?: string | null,"status"?: string,"updated_at"?: string,"year_made"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string | null,"id": string,"is_blocked": boolean,"notify_email": boolean,"notify_stock_alerts": boolean,"permissions": (string)[],"preferred_contact": string,"role": string,"updated_at": string,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id": string,"is_blocked"?: boolean,"notify_email"?: boolean,"notify_stock_alerts"?: boolean,"permissions"?: (string)[],"preferred_contact"?: string,"role"?: string,"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string | null,"id"?: string,"is_blocked"?: boolean,"notify_email"?: boolean,"notify_stock_alerts"?: boolean,"permissions"?: (string)[],"preferred_contact"?: string,"role"?: string,"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "hits": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "hits"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "hits"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"repair_quotes": {
                  Row: {
                    "created_at": string,"created_by": string | null,"decided_at": string | null,"decided_by": string | null,"decision_method": string | null,"decision_note": string,"id": string,"kind": string,"labour_amount": number,"notes": string,"parts_amount": number,"parts_detail": string,"repair_id": string,"status": string,"total_amount": number | null,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"decided_at"?: string | null,"decided_by"?: string | null,"decision_method"?: string | null,"decision_note"?: string,"id"?: string,"kind"?: string,"labour_amount": number,"notes"?: string,"parts_amount": number,"parts_detail"?: string,"repair_id": string,"status"?: string,"total_amount"?: never,"version": number
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"decided_at"?: string | null,"decided_by"?: string | null,"decision_method"?: string | null,"decision_note"?: string,"id"?: string,"kind"?: string,"labour_amount"?: number,"notes"?: string,"parts_amount"?: number,"parts_detail"?: string,"repair_id"?: string,"status"?: string,"total_amount"?: never,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "repair_quotes_repair_id_fkey"
      columns: ["repair_id"]
isOneToOne: false
      referencedRelation: "repairs"
      referencedColumns: ["id"]
    }
                  ]
                },"repair_work_log": {
                  Row: {
                    "created_at": string,"created_by": string | null,"entry": string,"id": string,"labour_minutes": number | null,"parts_used": string,"repair_id": string,"visible_to_customer": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"entry": string,"id"?: string,"labour_minutes"?: number | null,"parts_used"?: string,"repair_id": string,"visible_to_customer"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"entry"?: string,"id"?: string,"labour_minutes"?: number | null,"parts_used"?: string,"repair_id"?: string,"visible_to_customer"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "repair_work_log_repair_id_fkey"
      columns: ["repair_id"]
isOneToOne: false
      referencedRelation: "repairs"
      referencedColumns: ["id"]
    }
                  ]
                },"repairs": {
                  Row: {
                    "admin_notes": string,"brand": string,"collected_at": string | null,"completed_at": string | null,"created_at": string,"dropoff_notes": string,"email": string,"id": string,"model": string,"name": string,"preferred_contact": string,"preferred_date": string | null,"problem": string,"ref": string,"services": (string)[],"status": string,"updated_at": string,"user_id": string | null,"warranty_days": number | null,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_notes"?: string,"brand": string,"collected_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"dropoff_notes"?: string,"email": string,"id"?: string,"model": string,"name": string,"preferred_contact"?: string,"preferred_date"?: string | null,"problem": string,"ref"?: string,"services"?: (string)[],"status"?: string,"updated_at"?: string,"user_id"?: string | null,"warranty_days"?: number | null,"whatsapp"?: string | null
                  }
                  Update: {
                    "admin_notes"?: string,"brand"?: string,"collected_at"?: string | null,"completed_at"?: string | null,"created_at"?: string,"dropoff_notes"?: string,"email"?: string,"id"?: string,"model"?: string,"name"?: string,"preferred_contact"?: string,"preferred_date"?: string | null,"problem"?: string,"ref"?: string,"services"?: (string)[],"status"?: string,"updated_at"?: string,"user_id"?: string | null,"warranty_days"?: number | null,"whatsapp"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"reservations": {
                  Row: {
                    "closed_at": string | null,"contact_email": string | null,"contact_name": string,"contact_phone": string | null,"created_at": string,"expires_at": string,"id": string,"message": string,"price_at_reservation": number,"product_id": string,"ref": string,"source": string,"status": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"contact_email"?: string | null,"contact_name": string,"contact_phone"?: string | null,"created_at"?: string,"expires_at": string,"id"?: string,"message"?: string,"price_at_reservation": number,"product_id": string,"ref"?: string,"source"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "closed_at"?: string | null,"contact_email"?: string | null,"contact_name"?: string,"contact_phone"?: string | null,"created_at"?: string,"expires_at"?: string,"id"?: string,"message"?: string,"price_at_reservation"?: number,"product_id"?: string,"ref"?: string,"source"?: string,"status"?: string,"updated_at"?: string,"user_id"?: string | null
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
                },"reviews": {
                  Row: {
                    "body": string,"created_at": string,"display_name": string,"id": string,"moderated_at": string | null,"moderated_by": string | null,"moderation_note": string,"rating": number,"related_to": string,"status": string,"title": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"display_name": string,"id"?: string,"moderated_at"?: string | null,"moderated_by"?: string | null,"moderation_note"?: string,"rating": number,"related_to"?: string,"status"?: string,"title"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"display_name"?: string,"id"?: string,"moderated_at"?: string | null,"moderated_by"?: string | null,"moderation_note"?: string,"rating"?: number,"related_to"?: string,"status"?: string,"title"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"seller_enquiries": {
                  Row: {
                    "accessories": string,"admin_notes": string,"asking_price": number | null,"brand": string,"category": string | null,"condition": string,"created_at": string,"email": string,"faults": string,"handover_notes": string,"id": string,"inspection_date": string | null,"inspection_notes": string,"is_giveaway": boolean,"model": string,"name": string,"notes": string,"preferred_contact": string,"ref": string,"status": string,"suburb": string,"updated_at": string,"user_id": string | null,"whatsapp": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accessories"?: string,"admin_notes"?: string,"asking_price"?: number | null,"brand": string,"category"?: string | null,"condition": string,"created_at"?: string,"email": string,"faults"?: string,"handover_notes"?: string,"id"?: string,"inspection_date"?: string | null,"inspection_notes"?: string,"is_giveaway"?: boolean,"model": string,"name": string,"notes"?: string,"preferred_contact"?: string,"ref"?: string,"status"?: string,"suburb": string,"updated_at"?: string,"user_id"?: string | null,"whatsapp": string
                  }
                  Update: {
                    "accessories"?: string,"admin_notes"?: string,"asking_price"?: number | null,"brand"?: string,"category"?: string | null,"condition"?: string,"created_at"?: string,"email"?: string,"faults"?: string,"handover_notes"?: string,"id"?: string,"inspection_date"?: string | null,"inspection_notes"?: string,"is_giveaway"?: boolean,"model"?: string,"name"?: string,"notes"?: string,"preferred_contact"?: string,"ref"?: string,"status"?: string,"suburb"?: string,"updated_at"?: string,"user_id"?: string | null,"whatsapp"?: string
                  }
                  Relationships: [
                    
                  ]
                },"seller_offers": {
                  Row: {
                    "amount": number,"created_at": string,"direction": string,"id": string,"note": string,"recorded_by": string | null,"seller_enquiry_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"direction": string,"id"?: string,"note"?: string,"recorded_by"?: string | null,"seller_enquiry_id": string,"status"?: string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"direction"?: string,"id"?: string,"note"?: string,"recorded_by"?: string | null,"seller_enquiry_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "seller_offers_seller_enquiry_id_fkey"
      columns: ["seller_enquiry_id"]
isOneToOne: false
      referencedRelation: "seller_enquiries"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "business_name": string,"collection_area": string,"contact_email": string,"id": number,"legal_reviewed": boolean,"max_active_reservations_per_customer": number,"owner_notification_email": string,"repair_warranty_days": number | null,"repair_warranty_terms": string,"reservation_hours": number,"shop_notice": string,"social_handle": string,"updated_at": string,"whatsapp_display": string,"whatsapp_international": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_name"?: string,"collection_area"?: string,"contact_email"?: string,"id"?: number,"legal_reviewed"?: boolean,"max_active_reservations_per_customer"?: number,"owner_notification_email"?: string,"repair_warranty_days"?: number | null,"repair_warranty_terms"?: string,"reservation_hours"?: number,"shop_notice"?: string,"social_handle"?: string,"updated_at"?: string,"whatsapp_display"?: string,"whatsapp_international"?: string
                  }
                  Update: {
                    "business_name"?: string,"collection_area"?: string,"contact_email"?: string,"id"?: number,"legal_reviewed"?: boolean,"max_active_reservations_per_customer"?: number,"owner_notification_email"?: string,"repair_warranty_days"?: number | null,"repair_warranty_terms"?: string,"reservation_hours"?: number,"shop_notice"?: string,"social_handle"?: string,"updated_at"?: string,"whatsapp_display"?: string,"whatsapp_international"?: string
                  }
                  Relationships: [
                    
                  ]
                },"site_content": {
                  Row: {
                    "body": string,"is_draft": boolean,"is_legal": boolean,"key": string,"title": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"is_draft"?: boolean,"is_legal"?: boolean,"key": string,"title": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "body"?: string,"is_draft"?: boolean,"is_legal"?: boolean,"key"?: string,"title"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"status_history": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"customer_id": string | null,"entity_id": string,"entity_type": string,"from_status": string | null,"id": number,"note": string,"to_status": string,"visible_to_customer": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"customer_id"?: string | null,"entity_id": string,"entity_type": string,"from_status"?: string | null,"id"?: never,"note"?: string,"to_status": string,"visible_to_customer"?: boolean
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"customer_id"?: string | null,"entity_id"?: string,"entity_type"?: string,"from_status"?: string | null,"id"?: never,"note"?: string,"to_status"?: string,"visible_to_customer"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"stock_alerts": {
                  Row: {
                    "brand": string | null,"category": string | null,"created_at": string,"email": string,"id": string,"is_active": boolean,"keywords": string | null,"max_price": number | null,"unsubscribe_token": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "brand"?: string | null,"category"?: string | null,"created_at"?: string,"email": string,"id"?: string,"is_active"?: boolean,"keywords"?: string | null,"max_price"?: number | null,"unsubscribe_token"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "brand"?: string | null,"category"?: string | null,"created_at"?: string,"email"?: string,"id"?: string,"is_active"?: boolean,"keywords"?: string | null,"max_price"?: number | null,"unsubscribe_token"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"submission_files": {
                  Row: {
                    "created_at": string,"id": string,"mime_type": string,"path": string,"repair_id": string | null,"seller_enquiry_id": string | null,"size_bytes": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"mime_type": string,"path": string,"repair_id"?: string | null,"seller_enquiry_id"?: string | null,"size_bytes": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"mime_type"?: string,"path"?: string,"repair_id"?: string | null,"seller_enquiry_id"?: string | null,"size_bytes"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "submission_files_repair_id_fkey"
      columns: ["repair_id"]
isOneToOne: false
      referencedRelation: "repairs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submission_files_seller_enquiry_id_fkey"
      columns: ["seller_enquiry_id"]
isOneToOne: false
      referencedRelation: "seller_enquiries"
      referencedColumns: ["id"]
    }
                  ]
                },"wishlist_items": {
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
      foreignKeyName: "wishlist_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "apply_quote_decision":
{ Args: { "p_actor": string,"p_decision": string,"p_method": string,"p_note": string,"p_quote_id": string }; Returns: {
              "created_at": string,
"created_by": string | null,
"decided_at": string | null,
"decided_by": string | null,
"decision_method": string | null,
"decision_note": string,
"id": string,
"kind": string,
"labour_amount": number,
"notes": string,
"parts_amount": number,
"parts_detail": string,
"repair_id": string,
"status": string,
"total_amount": number | null,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "repair_quotes"
        isOneToOne: true
        isSetofReturn: false
      } },
"bootstrap_owner":
{ Args: { "p_email": string }; Returns: string
                           },
"check_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"customer_cancel_reservation":
{ Args: { "p_reservation_id": string }; Returns: {
              "closed_at": string | null,
"contact_email": string | null,
"contact_name": string,
"contact_phone": string | null,
"created_at": string,
"expires_at": string,
"id": string,
"message": string,
"price_at_reservation": number,
"product_id": string,
"ref": string,
"source": string,
"status": string,
"updated_at": string,
"user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "reservations"
        isOneToOne: true
        isSetofReturn: false
      } },
"customer_decide_quote":
{ Args: { "p_decision": string,"p_note"?: string,"p_quote_id": string }; Returns: {
              "created_at": string,
"created_by": string | null,
"decided_at": string | null,
"decided_by": string | null,
"decision_method": string | null,
"decision_note": string,
"id": string,
"kind": string,
"labour_amount": number,
"notes": string,
"parts_amount": number,
"parts_detail": string,
"repair_id": string,
"status": string,
"total_amount": number | null,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "repair_quotes"
        isOneToOne: true
        isSetofReturn: false
      } },
"expire_reservations":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"fail":
{ Args: { "p_message": string }; Returns: undefined
                           },
"has_perm":
{ Args: { "p_perm": string }; Returns: boolean
                           },
"is_owner":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"owner_set_access":
{ Args: { "p_blocked": boolean,"p_permissions": (string)[],"p_role": string,"p_user_id": string }; Returns: {
              "created_at": string,
"email": string | null,
"full_name": string | null,
"id": string,
"is_blocked": boolean,
"notify_email": boolean,
"notify_stock_alerts": boolean,
"permissions": (string)[],
"preferred_contact": string,
"role": string,
"updated_at": string,
"whatsapp": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "profiles"
        isOneToOne: true
        isSetofReturn: false
      } },
"reserve_product":
{ Args: { "p_email": string,"p_message": string,"p_name": string,"p_phone": string,"p_product_id": string,"p_user_id": string }; Returns: {
              "closed_at": string | null,
"contact_email": string | null,
"contact_name": string,
"contact_phone": string | null,
"created_at": string,
"expires_at": string,
"id": string,
"message": string,
"price_at_reservation": number,
"product_id": string,
"ref": string,
"source": string,
"status": string,
"updated_at": string,
"user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "reservations"
        isOneToOne: true
        isSetofReturn: false
      } },
"set_status":
{ Args: { "p_entity": string,"p_id": string,"p_note"?: string,"p_status": string,"p_visible"?: boolean }; Returns: undefined
                           },
"staff_record_quote_decision":
{ Args: { "p_decision": string,"p_method": string,"p_note": string,"p_quote_id": string }; Returns: {
              "created_at": string,
"created_by": string | null,
"decided_at": string | null,
"decided_by": string | null,
"decision_method": string | null,
"decision_note": string,
"id": string,
"kind": string,
"labour_amount": number,
"notes": string,
"parts_amount": number,
"parts_detail": string,
"repair_id": string,
"status": string,
"total_amount": number | null,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "repair_quotes"
        isOneToOne: true
        isSetofReturn: false
      } },
"staff_reservation_action":
{ Args: { "p_action": string,"p_hours"?: number,"p_note"?: string,"p_reservation_id": string }; Returns: {
              "closed_at": string | null,
"contact_email": string | null,
"contact_name": string,
"contact_phone": string | null,
"created_at": string,
"expires_at": string,
"id": string,
"message": string,
"price_at_reservation": number,
"product_id": string,
"ref": string,
"source": string,
"status": string,
"updated_at": string,
"user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "reservations"
        isOneToOne: true
        isSetofReturn: false
      } },
"staff_reserve_product":
{ Args: { "p_email": string,"p_hours": number,"p_name": string,"p_note": string,"p_phone": string,"p_product_id": string }; Returns: {
              "closed_at": string | null,
"contact_email": string | null,
"contact_name": string,
"contact_phone": string | null,
"created_at": string,
"expires_at": string,
"id": string,
"message": string,
"price_at_reservation": number,
"product_id": string,
"ref": string,
"source": string,
"status": string,
"updated_at": string,
"user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "reservations"
        isOneToOne: true
        isSetofReturn: false
      } },
"staff_seller_offer":
{ Args: { "p_amount": number,"p_direction": string,"p_enquiry_id": string,"p_note": string }; Returns: {
              "amount": number,
"created_at": string,
"direction": string,
"id": string,
"note": string,
"recorded_by": string | null,
"seller_enquiry_id": string,
"status": string
            }
                          SetofOptions: {
        from: "*"
        to: "seller_offers"
        isOneToOne: true
        isSetofReturn: false
      } },
"staff_seller_offer_decision":
{ Args: { "p_decision": string,"p_note"?: string,"p_offer_id": string }; Returns: {
              "amount": number,
"created_at": string,
"direction": string,
"id": string,
"note": string,
"recorded_by": string | null,
"seller_enquiry_id": string,
"status": string
            }
                          SetofOptions: {
        from: "*"
        to: "seller_offers"
        isOneToOne: true
        isSetofReturn: false
      } },
"staff_send_quote":
{ Args: { "p_kind": string,"p_labour": number,"p_notes": string,"p_parts": number,"p_parts_detail": string,"p_repair_id": string }; Returns: {
              "created_at": string,
"created_by": string | null,
"decided_at": string | null,
"decided_by": string | null,
"decision_method": string | null,
"decision_note": string,
"id": string,
"kind": string,
"labour_amount": number,
"notes": string,
"parts_amount": number,
"parts_detail": string,
"repair_id": string,
"status": string,
"total_amount": number | null,
"version": number
            }
                          SetofOptions: {
        from: "*"
        to: "repair_quotes"
        isOneToOne: true
        isSetofReturn: false
      } },
"staff_set_product_status":
{ Args: { "p_note"?: string,"p_product_id": string,"p_status": string }; Returns: {
              "accessories": string,
"brand": string,
"category": string,
"condition": string,
"created_at": string,
"created_by": string | null,
"defects": string,
"description": string,
"description_approved": boolean,
"id": string,
"is_featured": boolean,
"is_new_arrival": boolean,
"model": string,
"price": number,
"provenance": string,
"public_serial": string | null,
"published_at": string | null,
"ref": string,
"search": unknown,
"slug": string,
"sold_at": string | null,
"status": string,
"updated_at": string,
"year_made": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "products"
        isOneToOne: true
        isSetofReturn: false
      } },
"submit_enquiry":
{ Args: { "p_email": string,"p_message": string,"p_name": string,"p_phone": string,"p_preferred_contact": string,"p_product_ids": (string)[],"p_user_id": string }; Returns: {
              "admin_notes": string,
"created_at": string,
"email": string,
"id": string,
"message": string,
"name": string,
"phone": string | null,
"preferred_contact": string,
"ref": string,
"status": string,
"updated_at": string,
"user_id": string | null
            }
                          SetofOptions: {
        from: "*"
        to: "enquiries"
        isOneToOne: true
        isSetofReturn: false
      } },
"track_page_view":
{ Args: { "p_path": string }; Returns: undefined
                           },
"track_product_view":
{ Args: { "p_product_id": string }; Returns: undefined
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
