import { supabase } from '../lib/supabase';

export type EmailAIExtractionRow = {
  id: string;
  email_message_id: string;
  model: string;
  output_json: any;
  confidence: number;
  reasoning?: string | null;
  status: 'auto_imported' | 'needs_review' | 'ignored';
  created_at: string;
};

export class EmailAIExtractionService {
  static async saveExtraction(params: {
    emailMessageId: string;
    model: string;
    output: any;
    confidence: number;
    reasoning?: string | null;
    status?: 'auto_imported' | 'needs_review' | 'ignored';
  }): Promise<EmailAIExtractionRow | null> {
    const { data, error } = await supabase
      .from('email_ai_extractions')
      .insert({
        email_message_id: params.emailMessageId,
        model: params.model,
        output_json: params.output,
        confidence: params.confidence,
        reasoning: params.reasoning || null,
        status: params.status || 'needs_review'
      })
      .select('*')
      .single();
    if (error) {
      console.warn('[EmailAIExtractionService] saveExtraction failed', error);
      return null;
    }
    return data as unknown as EmailAIExtractionRow;
  }

  static async getLatestByEmailMessageId(emailMessageId: string): Promise<EmailAIExtractionRow | null> {
    const { data, error } = await supabase
      .from('email_ai_extractions')
      .select('*')
      .eq('email_message_id', emailMessageId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('[EmailAIExtractionService] getLatestByEmailMessageId failed', error);
      return null;
    }
    return (data || null) as unknown as EmailAIExtractionRow | null;
  }
}

export default EmailAIExtractionService;


