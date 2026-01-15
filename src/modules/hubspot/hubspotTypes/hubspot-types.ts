export interface CreateContactResponse {
  archived: boolean;
  createdAt: string; // ISO date string
  id: string;
  properties: {
    property_checkbox: string; // "false" or "true" as string
    property_date: string; // timestamp as string
    property_dropdown: string; // e.g., "choice_b"
    property_multiple_checkboxes: string; // semicolon-separated string
    property_number: string; // number as string
    property_radio: string; // e.g., "option_1"
    property_string: string; // free text
  };
  updatedAt: string; // ISO date string
}
