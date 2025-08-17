import { supabase } from '../lib/supabase';
import type { EmailMessage } from '../types/ota';

export class GmailIngestionService {
  /**
   * Poll Gmail history for changes since the stored startHistoryId.
   * This is a stub for integration with the Gmail API.
   */
  static async pollAndIngest(): Promise<{ ingested: number }> {
    // TODO: Integrate with Gmail API; for now, no-op
    return { ingested: 0 };
  }

  /**
   * Persist a minimal email message record
   */
  static async saveEmailMessage(message: Omit<EmailMessage, 'id' | 'created_at' | 'updated_at'>): Promise<EmailMessage> {
    const { data, error } = await supabase
      .from('email_messages')
      .insert({
        gmail_message_id: message.gmail_message_id,
        thread_id: message.thread_id,
        label_ids: message.label_ids,
        sender: message.sender,
        recipient: message.recipient,
        subject: message.subject,
        received_at: message.received_at,
        snippet: message.snippet,
        mime_summary: message.mime_summary,
        raw_source_ref: message.raw_source_ref
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as EmailMessage;
  }
}

export default GmailIngestionService; 