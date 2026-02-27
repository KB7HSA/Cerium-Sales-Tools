import axios from 'axios';
import { azureOpenAIConfig } from '../config/server';

export interface AIGenerationRequest {
  prompt: string;
  customerName: string;
  companyName?: string;
  customerEmail?: string;
  referenceArchitecture: string;
  assessmentType: string;
  assessmentTypeDescription?: string;
  assessmentTypeCategory?: string;
  scopeContext?: string;
  methodologyContext?: string;
  additionalNotes?: string;
  technicalResources?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIGenerationResponse {
  generated: boolean;
  content: string;
  tokens: number;
  promptTokens?: number;
  completionTokens?: number;
  model: string;
  finishReason: string;
  systemPrompt?: string;
  userPrompt?: string;
}

/**
 * Azure OpenAI Service
 * 
 * Integrates with Azure OpenAI to generate personalized assessment content.
 * Falls back to template-based generation if Azure OpenAI is not configured.
 */
export class AzureOpenAIService {

  /**
   * Check if Azure OpenAI is properly configured
   */
  static isConfigured(): boolean {
    return !!(azureOpenAIConfig.endpoint && azureOpenAIConfig.apiKey);
  }

  /**
   * Generate content using Azure OpenAI
   */
  static async generateContent(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    if (!this.isConfigured()) {
      console.warn('⚠️ Azure OpenAI not configured. Using template fallback.');
      return this.generateFallbackContent(request);
    }

    try {
      const systemPrompt = request.systemPrompt || this.buildSystemPrompt(request);
      const userPrompt = this.buildUserPrompt(request);

      const url = `${azureOpenAIConfig.endpoint}/openai/deployments/${azureOpenAIConfig.deploymentName}/chat/completions?api-version=${azureOpenAIConfig.apiVersion}`;

      // Build request body — reasoning models (o1, o3, o4-mini, etc.) do NOT support temperature
      const isReasoningModel = /^(o1|o3|o4)/i.test(azureOpenAIConfig.deploymentName.trim());

      // For reasoning models, max_completion_tokens covers BOTH reasoning (thinking) AND
      // output tokens. We need a much higher budget to avoid the model exhausting tokens
      // on reasoning and returning empty content. Use at least 16384 for reasoning models.
      const baseMaxTokens = request.maxTokens || 4000;
      const effectiveMaxTokens = isReasoningModel ? Math.max(baseMaxTokens * 4, 16384) : baseMaxTokens;

      const requestBody: any = {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: effectiveMaxTokens,
      };
      if (!isReasoningModel && request.temperature !== undefined) {
        requestBody.temperature = request.temperature;
      }

      // Reasoning models need more time (thinking + generation)
      const timeout = isReasoningModel ? 180000 : 60000;

      console.log(`🤖 Azure OpenAI request to ${azureOpenAIConfig.deploymentName} (reasoning=${isReasoningModel})`);
      console.log(`🌡️ Temperature: ${requestBody.temperature !== undefined ? requestBody.temperature : 'not set (reasoning model)'}`);
      console.log(`📝 System prompt length: ${systemPrompt.length} chars`);
      console.log(`📝 User prompt length: ${userPrompt.length} chars`);
      console.log(`🎯 max_completion_tokens: ${effectiveMaxTokens} (base: ${baseMaxTokens}, reasoning: ${isReasoningModel})`);
      console.log(`⏱️ Timeout: ${timeout / 1000}s`);

      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': azureOpenAIConfig.apiKey,
        },
        timeout,
      });

      const choice = response.data.choices?.[0];
      const usage = response.data.usage;

      return {
        generated: true,
        content: choice?.message?.content || '',
        tokens: usage?.total_tokens || 0,
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        model: response.data.model || azureOpenAIConfig.deploymentName,
        finishReason: choice?.finish_reason || 'unknown',
        systemPrompt,
        userPrompt,
      };

    } catch (error: any) {
      console.error('❌ Azure OpenAI API error:', error.response?.data || error.message);
      
      // If it's a configuration/auth error, return helpful message
      if (error.response?.status === 401) {
        throw new Error('Azure OpenAI authentication failed. Check your API key.');
      }
      if (error.response?.status === 404) {
        throw new Error(`Azure OpenAI deployment "${azureOpenAIConfig.deploymentName}" not found. Check your deployment name.`);
      }
      if (error.response?.status === 429) {
        throw new Error('Azure OpenAI rate limit exceeded. Please try again in a moment.');
      }
      
      // For other errors, fall back to template
      console.warn('⚠️ Falling back to template-based generation.');
      return this.generateFallbackContent(request);
    }
  }

  /**
   * Generate an executive summary for an assessment
   */
  static async generateExecutiveSummary(
    customerName: string,
    companyName: string,
    assessmentType: string,
    referenceArchitecture: string,
    customPrompt?: string,
    additionalNotes?: string,
    extraContext?: { customerEmail?: string; assessmentTypeDescription?: string; assessmentTypeCategory?: string; scopeContext?: string; methodologyContext?: string; technicalResources?: string; temperature?: number }
  ): Promise<AIGenerationResponse> {
    return this.generateContent({
      prompt: customPrompt || '',
      customerName,
      companyName,
      referenceArchitecture,
      assessmentType,
      additionalNotes: additionalNotes || '',
      customerEmail: extraContext?.customerEmail,
      assessmentTypeDescription: extraContext?.assessmentTypeDescription,
      assessmentTypeCategory: extraContext?.assessmentTypeCategory,
      scopeContext: extraContext?.scopeContext,
      methodologyContext: extraContext?.methodologyContext,
      technicalResources: extraContext?.technicalResources,
      temperature: extraContext?.temperature,
      systemPrompt: `You are an expert IT consultant at Cerium Networks, a managed services provider. 
You write professional, detailed executive summaries for assessment documents for enterprise clients.
Your writing style is clear, authoritative, and actionable.
Always structure content with bullet points and clear sections where appropriate.
Focus on business impact and actionable recommendations.
Use ALL the context provided (client info, assessment details, scope, methodology, notes, and AI instructions) to generate a tailored, specific executive summary.
Do NOT include any markdown headers (# or ##) — the document template handles headers.`,
    });
  }

  /**
   * Generate findings for an assessment
   */
  static async generateFindings(
    customerName: string,
    companyName: string,
    assessmentType: string,
    referenceArchitecture: string,
    customPrompt?: string,
    additionalNotes?: string,
    extraContext?: { customerEmail?: string; assessmentTypeDescription?: string; assessmentTypeCategory?: string; scopeContext?: string; methodologyContext?: string; technicalResources?: string; temperature?: number }
  ): Promise<AIGenerationResponse> {
    return this.generateContent({
      prompt: customPrompt || '',
      customerName,
      companyName,
      referenceArchitecture,
      assessmentType,
      additionalNotes: additionalNotes || '',
      customerEmail: extraContext?.customerEmail,
      assessmentTypeDescription: extraContext?.assessmentTypeDescription,
      assessmentTypeCategory: extraContext?.assessmentTypeCategory,
      scopeContext: extraContext?.scopeContext,
      methodologyContext: extraContext?.methodologyContext,
      technicalResources: extraContext?.technicalResources,
      temperature: extraContext?.temperature,
      systemPrompt: `You are an expert IT consultant at Cerium Networks.
Generate detailed assessment findings based on ALL the context provided.
Categorize findings by risk level (Critical, High, Medium, Low).
Provide specific technical details, business context, and estimated impact.
Format findings clearly with headers and bullet points.
Use the assessment scope, methodology, additional notes, and AI instructions to generate specific, relevant findings — not generic ones.
Do NOT include any markdown headers (# or ##) — the document template handles headers.`,
    });
  }

  /**
   * Generate recommendations for an assessment
   */
  static async generateRecommendations(
    customerName: string,
    companyName: string,
    assessmentType: string,
    referenceArchitecture: string,
    customPrompt?: string,
    additionalNotes?: string,
    extraContext?: { customerEmail?: string; assessmentTypeDescription?: string; assessmentTypeCategory?: string; scopeContext?: string; methodologyContext?: string; technicalResources?: string; temperature?: number }
  ): Promise<AIGenerationResponse> {
    return this.generateContent({
      prompt: customPrompt || '',
      customerName,
      companyName,
      referenceArchitecture,
      assessmentType,
      additionalNotes: additionalNotes || '',
      customerEmail: extraContext?.customerEmail,
      assessmentTypeDescription: extraContext?.assessmentTypeDescription,
      assessmentTypeCategory: extraContext?.assessmentTypeCategory,
      scopeContext: extraContext?.scopeContext,
      methodologyContext: extraContext?.methodologyContext,
      technicalResources: extraContext?.technicalResources,
      temperature: extraContext?.temperature,
      systemPrompt: `You are an expert IT consultant at Cerium Networks.
Generate prioritized recommendations based on ALL the context provided.
Organize into Quick Wins (0-30 days), Short-term (1-3 months), and Long-term (3-12 months).
Include estimated effort, cost range, and timeline for each recommendation.
Include both technical and business justifications.
Use the assessment scope, methodology, additional notes, and AI instructions to generate specific, actionable recommendations — not generic ones.
Do NOT include any markdown headers (# or ##) — the document template handles headers.`,
    });
  }

  /**
   * Generate proposed assessment scope
   */
  static async generateScope(
    customerName: string,
    companyName: string,
    assessmentType: string,
    referenceArchitecture: string,
    customPrompt?: string,
    additionalNotes?: string,
    extraContext?: { customerEmail?: string; assessmentTypeDescription?: string; assessmentTypeCategory?: string; scopeContext?: string; methodologyContext?: string; technicalResources?: string; temperature?: number }
  ): Promise<AIGenerationResponse> {
    return this.generateContent({
      prompt: customPrompt || '',
      customerName,
      companyName,
      referenceArchitecture,
      assessmentType,
      additionalNotes: additionalNotes || '',
      customerEmail: extraContext?.customerEmail,
      assessmentTypeDescription: extraContext?.assessmentTypeDescription,
      assessmentTypeCategory: extraContext?.assessmentTypeCategory,
      scopeContext: extraContext?.scopeContext,
      methodologyContext: extraContext?.methodologyContext,
      technicalResources: extraContext?.technicalResources,
      temperature: extraContext?.temperature,
      systemPrompt: `You are an expert IT consultant at Cerium Networks, a managed services provider.
Generate a detailed Proposed Assessment Scope section for an assessment document.
The scope should clearly define:
- What systems, infrastructure, and environments will be evaluated
- Specific areas of focus and assessment boundaries
- In-scope and out-of-scope items
- Key stakeholders and their involvement
- Data collection methods and access requirements
- Timeline expectations and milestones
Use the existing Scope Template, methodology context, additional notes, and AI instructions to generate a specific, tailored scope — not a generic one.
Write in a professional, clear style appropriate for a formal assessment proposal.
Do NOT include any markdown headers (# or ##) — the document template handles headers.`,
    });
  }

  /**
   * Review a completed document for professionalism and completeness.
   * Returns a JSON object with a 1-10 rating and improvement suggestions.
   */
  static async reviewDocument(
    documentContent: string,
    assessmentType: string,
    customerName: string
  ): Promise<{ rating: number; suggestions: string[]; summary: string }> {
    if (!this.isConfigured()) {
      return {
        rating: 0,
        suggestions: ['Azure OpenAI is not configured. Unable to perform professional review.'],
        summary: 'AI review unavailable — Azure OpenAI not configured.',
      };
    }

    try {
      const systemPrompt = `You are a senior document quality reviewer at Cerium Networks, a managed services provider.
Your task is to review a completed assessment document for professionalism, completeness, and quality.

You MUST respond with ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "rating": <number 1-10>,
  "summary": "<one-sentence overall assessment>",
  "suggestions": [
    "<specific improvement suggestion 1>",
    "<specific improvement suggestion 2>"
  ]
}

Rating scale:
1-3: Major issues — document needs significant rework
4-5: Below average — multiple areas need improvement
6-7: Acceptable — some improvements recommended
8-9: Professional — minor polish needed
10: Excellent — publication-ready

Evaluate these dimensions:
- Professional tone and language
- Completeness of sections (executive summary, findings, recommendations)
- Specificity (tailored to client vs generic)
- Actionable recommendations with timelines/priorities
- Logical structure and flow
- Grammar and clarity
- Technical accuracy and depth
- Business value articulation`;

      const userPrompt = `Review the following ${assessmentType} document prepared for ${customerName}. Provide your rating and specific improvement suggestions.

=== DOCUMENT CONTENT ===
${documentContent}

Remember: Respond with ONLY valid JSON — no markdown, no code fences.`;

      const url = `${azureOpenAIConfig.endpoint}/openai/deployments/${azureOpenAIConfig.deploymentName}/chat/completions?api-version=${azureOpenAIConfig.apiVersion}`;

      const isReasoningModel = /^(o1|o3|o4)/i.test(azureOpenAIConfig.deploymentName);
      const requestBody: any = {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_completion_tokens: 2000,
      };
      if (!isReasoningModel) {
        requestBody.temperature = 0.3;
      }

      console.log(`🔍 Document review request to ${azureOpenAIConfig.deploymentName}`);

      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': azureOpenAIConfig.apiKey,
        },
        timeout: 60000,
      });

      const content = response.data.choices?.[0]?.message?.content || '';
      
      // Parse JSON response — strip any markdown fences if present
      const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        rating: Math.min(10, Math.max(1, Number(parsed.rating) || 5)),
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        summary: parsed.summary || 'Review completed.',
      };

    } catch (error: any) {
      console.error('❌ Document review error:', error.response?.data || error.message);
      return {
        rating: 0,
        suggestions: [`Review failed: ${error.message || 'Unknown error'}`],
        summary: 'Unable to complete professional review.',
      };
    }
  }

  /**
   * Build the system prompt for general assessment content generation
   */
  private static buildSystemPrompt(request: AIGenerationRequest): string {
    return `You are an expert IT consultant at Cerium Networks, a managed services and technology solutions provider.

You are writing content for a ${request.assessmentType} document for a client.

Guidelines:
- Write professionally and concisely
- Use bullet points for lists and key findings
- Focus on actionable insights and business impact
- Reference the client's specific technology environment where relevant
- Structure content with clear sections
- Be specific rather than generic — tailor to the assessment type and reference architecture
- Do NOT include any markdown headers (# or ##) — the document template handles headers`;
  }

  /**
   * Public method to preview the prompt that would be sent to Azure OpenAI.
   * Used for debugging from the frontend.
   */
  static buildPromptPreview(request: AIGenerationRequest, overrideSystemPrompt?: string): { systemPrompt: string; userPrompt: string; model: string; configured: boolean } {
    return {
      systemPrompt: overrideSystemPrompt || request.systemPrompt || this.buildSystemPrompt(request),
      userPrompt: this.buildUserPrompt(request),
      model: azureOpenAIConfig.deploymentName,
      configured: this.isConfigured(),
    };
  }

  /**
   * Build the user prompt from the request — includes ALL available context
   */
  private static buildUserPrompt(request: AIGenerationRequest): string {
    const company = request.companyName || request.customerName;
    const sections: string[] = [];

    // Section 1: Client Information
    sections.push('=== CLIENT INFORMATION ===');
    sections.push(`Company: ${company}`);
    if (request.customerName && request.customerName !== company) {
      sections.push(`Contact: ${request.customerName}`);
    }
    if (request.customerEmail) {
      sections.push(`Email: ${request.customerEmail}`);
    }

    // Section 2: Assessment Context
    sections.push('');
    sections.push('=== ASSESSMENT CONTEXT ===');
    sections.push(`Assessment Type: ${request.assessmentType}`);
    if (request.assessmentTypeDescription) {
      sections.push(`Description: ${request.assessmentTypeDescription}`);
    }
    if (request.assessmentTypeCategory) {
      sections.push(`Category: ${request.assessmentTypeCategory}`);
    }
    sections.push(`Reference Architecture / Technology Stack: ${request.referenceArchitecture}`);

    // Section 3: Assessment Scope & Methodology (from templates — gives AI context about what the assessment covers)
    if (request.scopeContext && request.scopeContext.trim()) {
      sections.push('');
      sections.push('=== ASSESSMENT SCOPE ===');
      sections.push(request.scopeContext.trim());
    }
    if (request.methodologyContext && request.methodologyContext.trim()) {
      sections.push('');
      sections.push('=== ASSESSMENT METHODOLOGY ===');
      sections.push(request.methodologyContext.trim());
    }

    // Section 4: Additional Notes from the user (observations, concerns, specific details)
    if (request.additionalNotes && request.additionalNotes.trim()) {
      sections.push('');
      sections.push('=== ADDITIONAL NOTES & OBSERVATIONS ===');
      sections.push('(Use these specific details, observations, and concerns to personalize and ground the content):');
      sections.push(request.additionalNotes.trim());
    }

    // Section 5: AI Prompt Instructions from Administrator (from the Assessment Type configuration)
    if (request.prompt && request.prompt.trim()) {
      sections.push('');
      sections.push('=== AI GENERATION INSTRUCTIONS ===');
      sections.push('(Follow these specific instructions from the administrator for generating this content):');
      sections.push(request.prompt.trim());
    }

    // Section 6: Technical Reference Documents (extracted text from resource files)
    if (request.technicalResources && request.technicalResources.trim()) {
      sections.push('');
      sections.push('=== TECHNICAL REFERENCE DOCUMENTS ===');
      sections.push('(Use these technical reference documents as authoritative source material to inform and ground your content. Reference specific details, standards, and recommendations from these documents where relevant):');
      sections.push(request.technicalResources.trim());
    }

    // Section 7: Final generation directive
    sections.push('');
    sections.push('=== TASK ===');
    sections.push(`Using ALL of the context above, generate professional, detailed content for this ${request.assessmentType}. Tailor the content specifically to ${company} and their ${request.referenceArchitecture} environment. Incorporate any additional notes, follow the AI generation instructions if provided, and reference technical resource documents where applicable.`);

    return sections.join('\n');
  }

  /**
   * Template-based fallback when Azure OpenAI is not configured
   */
  private static generateFallbackContent(request: AIGenerationRequest): AIGenerationResponse {
    const company = request.companyName || request.customerName;
    const type = request.assessmentType.toLowerCase();
    let content: string;

    if (type.includes('security')) {
      content = `This Security Assessment provides a comprehensive evaluation of ${company}'s current security posture across their ${request.referenceArchitecture} environment.\n\nOur team conducted a thorough analysis of security controls, policies, and configurations to identify potential vulnerabilities and areas for improvement. The assessment covered:\n\n• Access Management and Identity Controls\n• Network Security Architecture\n• Data Protection and Encryption\n• Endpoint Security Measures\n• Incident Response Capabilities\n• Security Monitoring and Logging\n\nKey focus areas include evaluating the effectiveness of existing security controls, identifying gaps in protection, and providing actionable recommendations to strengthen ${company}'s overall security posture.`;
    } else if (type.includes('infrastructure')) {
      content = `This Infrastructure Assessment evaluates ${company}'s ${request.referenceArchitecture} environment to identify optimization opportunities, capacity constraints, and modernization paths.\n\nOur comprehensive review covers:\n\n• Server Infrastructure and Virtualization\n• Storage Systems and Data Management\n• Network Architecture and Connectivity\n• Disaster Recovery and Business Continuity\n• Performance and Capacity Planning\n• Infrastructure Lifecycle Management\n\nThe assessment provides ${company} with a clear understanding of their current infrastructure state, identifies technical debt, and outlines a strategic roadmap for infrastructure improvements.`;
    } else if (type.includes('cloud')) {
      content = `This Cloud Readiness Assessment evaluates ${company}'s preparedness for migrating to or expanding their ${request.referenceArchitecture} cloud environment.\n\nOur evaluation encompasses:\n\n• Application Portfolio Analysis\n• Workload Classification and Dependencies\n• Cloud Cost Modeling and TCO Analysis\n• Security and Compliance Considerations\n• Skills and Organizational Readiness\n• Migration Strategy and Planning\n\nThe assessment will help ${company} understand their cloud readiness maturity, identify potential challenges, and develop a strategic approach to cloud adoption.`;
    } else {
      content = `This ${request.assessmentType} provides a comprehensive evaluation of ${company}'s ${request.referenceArchitecture} environment.\n\nOur team will conduct a thorough analysis to:\n\n• Assess current state and capabilities\n• Identify areas for improvement\n• Evaluate risks and challenges\n• Provide actionable recommendations\n• Develop a strategic improvement roadmap\n\nThe assessment delivers ${company} with clear insights and a prioritized plan for achieving their technology objectives.`;
    }

    return {
      generated: true,
      content,
      tokens: content.length,
      model: 'template-fallback',
      finishReason: 'template',
    };
  }
}
