// =============================================================================
// Survey Type Definitions (New API Structure)
// =============================================================================

export type SurveyType = "BASELINE" | "ENDLINE" | "OTHER";
export type SurveyQuestionType = "TEXT" | "RADIO" | "CHECKBOX" | "GRID";

// =============================================================================
// Form Types (Client-side editing state) - Layer 1
// =============================================================================

/**
 * Grid row form type for GRID questions
 */
export interface SurveyGridRowForm {
  id?: string;                    // Server ID when editing existing
  rowNumber: number;
  rowText: string;
  rowImage?: string;
  rowImageFile?: File;
}

/**
 * Choice with embedded follow-up support (like Evaluation pattern)
 */
export interface SurveyChoiceForm {
  clientId: string;
  choiceOrder?: string;           // A, B, C, etc.
  choiceText: string;
  choiceImage?: string;
  choiceImageFile?: File;
  id?: string;                    // Server ID when editing existing
  hasTextInput?: boolean;         // Allow text input for this choice (new API)
  
  // Follow-up embedded in choice (like Evaluation pattern)
  hasFollowUp?: boolean;
  followUpQuestion?: SurveyEntryForm;
}

/**
 * Entry/Question form type with new follow-up logic
 */
export interface SurveyEntryForm {
  clientId: string;
  question: string;
  questionNumber?: number;
  questionImage?: string;
  questionImageFile?: File;
  questionType: SurveyQuestionType;
  isRequired: boolean;
  choices: SurveyChoiceForm[];
  gridRows: SurveyGridRowForm[];
  hasTextInput?: boolean;              // Allow "Other" text input (only for RADIO/CHECKBOX)
  
  // Follow-up logic (same as Evaluation)
  isFollowUp: boolean;
  parentQuestionClientId?: string;     // Client ID reference (for creation)
  triggerChoiceClientIds?: string[];   // Client ID references (for creation)
  parentQuestionId?: string;           // Server ID (for editing)
  triggerChoiceIds?: string[];         // Server IDs (for editing)
  
  id?: string;                         // Server ID when editing
}

/**
 * Section form type
 */
export interface SurveySectionForm {
  title: string;
  description?: string;
  sectionNumber?: number;
  entries: SurveyEntryForm[];
  id?: string;                         // Server ID when editing
}

// =============================================================================
// Payload Types (API Mutations) - Layer 2
// =============================================================================

export interface SurveyChoicePayload {
  clientId: string;
  choiceOrder?: string;
  choiceText: string;
  choiceImage?: string;
  hasTextInput?: boolean;
}

export interface SurveyGridRowPayload {
  rowNumber: number;
  rowText: string;
  rowImage?: string;
}

export interface SurveyEntryPayload {
  clientId: string;
  question: string;
  questionNumber?: number;
  questionImage?: string;
  questionType: SurveyQuestionType;
  isRequired: boolean;
  choices: SurveyChoicePayload[];
  gridRows: SurveyGridRowPayload[];
  hasTextInput?: boolean;
  
  isFollowUp: boolean;
  parentQuestionClientId?: string;
  triggerChoiceClientIds?: string[];
  parentQuestionId?: string;
  triggerChoiceIds?: string[];
}

export interface SurveySectionPayload {
  title: string;
  description?: string;
  sectionNumber?: number;
  entries: SurveyEntryPayload[];
}

export interface CreateSurveyPayload {
  name: string;
  type: SurveyType;
  description: string;
  sections: SurveySectionPayload[];
}

// =============================================================================
// Response Types (API Responses) - Layer 3
// =============================================================================

export interface SurveyChoiceResponse {
  id: string;
  choiceOrder: string;
  choiceText: string;
  choiceImageUrl?: string | null;
  hasTextInput?: boolean;         // New API field
}

export interface SurveyGridRowResponse {
  id?: string;                    // Server ID for update operations
  rowNumber: number;
  rowText: string;
  rowImageUrl?: string | null;
}

export interface SurveyEntryResponse {
  id: string;
  questionNumber: number;
  question: string;
  questionImageUrl?: string | null;
  questionType: SurveyQuestionType;
  isRequired: boolean;
  choices: SurveyChoiceResponse[];
  gridRows: SurveyGridRowResponse[];
  hasTextInput?: boolean;
  
  isFollowUp: boolean;
  parentQuestionId?: string | null;
  triggerChoiceIds?: string[];
}

export interface SurveySectionResponse {
  id: string;
  title: string;
  description?: string | null;
  sectionNumber: number;
  entries: SurveyEntryResponse[];
}

export interface SurveyDetailResponse {
  id: string;
  name: string;
  type: SurveyType | null;
  description: string;
  sections: SurveySectionResponse[];
}

export interface SurveySummary {
  id: string;
  name: string;
  type: SurveyType | null;
  description: string;
  sectionCount: number;
}

// =============================================================================
// API Response Wrappers
// =============================================================================

export interface SurveysApiResponse {
  code: string;
  surveys: SurveySummary[];
  message: string;
}

export interface SurveyDetailApiResponse {
  code: string;
  survey: SurveyDetailResponse;
  message: string;
}

export interface ApiErrorResponse {
  message?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create an empty choice with clientId
 */
export const emptyChoice = (order?: number): SurveyChoiceForm => ({
  clientId: crypto.randomUUID(),
  choiceOrder: order !== undefined ? String.fromCharCode(65 + order) : undefined,
  choiceText: "",
  hasFollowUp: false
});

/**
 * Create an empty entry/question with clientId
 */
export const emptyEntry = (questionNumber?: number): SurveyEntryForm => ({
  clientId: crypto.randomUUID(),
  question: "",
  questionNumber,
  questionType: "RADIO",
  isRequired: true,
  choices: [emptyChoice(0), emptyChoice(1)],
  gridRows: [],
  hasTextInput: false,
  isFollowUp: false
});

/**
 * Create an empty section
 */
export const emptySection = (sectionNumber?: number): SurveySectionForm => ({
  title: sectionNumber ? `Section ${sectionNumber}` : "",
  description: "",
  sectionNumber,
  entries: [emptyEntry(1)]
});

/**
 * Create an empty follow-up question linked to a parent
 */
export const createEmptyFollowUp = (
  parentClientId: string, 
  triggerChoiceClientId: string,
  questionNumber?: number
): SurveyEntryForm => ({
  clientId: crypto.randomUUID(),
  question: "",
  questionNumber,
  questionType: "TEXT",
  isRequired: false,
  choices: [],
  gridRows: [],
  isFollowUp: true,
  parentQuestionClientId: parentClientId,
  triggerChoiceClientIds: [triggerChoiceClientId]
});

/**
 * Get default fields based on question type
 */
export const getDefaultQuestionFields = (questionType: SurveyQuestionType): Partial<SurveyEntryForm> => {
  switch (questionType) {
    case "TEXT":
      return {
        choices: [],
        gridRows: []
      };
    case "RADIO":
    case "CHECKBOX":
      return {
        choices: [emptyChoice(0), emptyChoice(1)],
        gridRows: []
      };
    case "GRID":
      return {
        choices: [emptyChoice(0), emptyChoice(1)],
        gridRows: [
          { rowNumber: 1, rowText: "" },
          { rowNumber: 2, rowText: "" }
        ]
      };
    default:
      return {};
  }
};

/**
 * Validate a survey entry
 */
export const validateSurveyEntry = (entry: SurveyEntryForm): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!entry.question.trim()) {
    errors.push("Question text is required");
  }
  
  if (entry.questionType === "RADIO" || entry.questionType === "CHECKBOX") {
    if (entry.choices.length < 2) {
      errors.push("At least 2 choices are required");
    }
    const emptyChoices = entry.choices.filter(c => !c.choiceText.trim() && !c.choiceImage && !c.choiceImageFile);
    if (emptyChoices.length > 0) {
      errors.push("All choices must have text or an image");
    }
  }
  
  if (entry.questionType === "GRID") {
    if (entry.choices.length < 2) {
      errors.push("At least 2 column options are required");
    }
    if (entry.gridRows.length < 2) {
      errors.push("At least 2 row options are required");
    }
  }
  
  // Validate follow-up configuration
  if (entry.isFollowUp) {
    if (!entry.parentQuestionClientId && !entry.parentQuestionId) {
      errors.push("Follow-up question must have a parent question");
    }
    if ((!entry.triggerChoiceClientIds || entry.triggerChoiceClientIds.length === 0) && 
        (!entry.triggerChoiceIds || entry.triggerChoiceIds.length === 0)) {
      errors.push("Follow-up question must have at least one trigger choice");
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// =============================================================================
// Transform Functions
// =============================================================================

/**
 * Transform API response to form state (for loading existing surveys)
 */
export const transformResponseToForm = (response: SurveyDetailResponse): SurveySectionForm[] => {
  return response.sections.map((section, sIndex) => {
    // Separate main questions from follow-ups
    const mainEntries = section.entries.filter(e => !e.isFollowUp);
    const followUpEntries = section.entries.filter(e => e.isFollowUp);
    
    // Build entries map for lookup
    const entriesById = new Map<string, SurveyEntryResponse>();
    section.entries.forEach(e => entriesById.set(e.id, e));
    
    // Process main entries and nest follow-ups into their trigger choices
    const processedEntries: SurveyEntryForm[] = mainEntries.map(entry => {
      const formEntry: SurveyEntryForm = {
        clientId: entry.id,  // Use server ID as clientId for existing entries
        question: entry.question,
        questionNumber: entry.questionNumber,
        questionImage: entry.questionImageUrl || undefined,
        questionType: entry.questionType,
        isRequired: entry.isRequired,
        hasTextInput: entry.hasTextInput || false,
        choices: entry.choices.map(choice => {
          // Find follow-ups triggered by this choice
          const relevantFollowUps = followUpEntries.filter(fu => 
            fu.parentQuestionId === entry.id && 
            fu.triggerChoiceIds?.includes(choice.id)
          );
          
          const choiceForm: SurveyChoiceForm = {
            clientId: choice.id,  // Use server ID as clientId
            choiceOrder: choice.choiceOrder,
            choiceText: choice.choiceText,
            choiceImage: choice.choiceImageUrl || undefined,
            id: choice.id,
            hasTextInput: choice.hasTextInput || false,  // Map from API response
            hasFollowUp: relevantFollowUps.length > 0
          };
          
          // Nest the first follow-up into the choice
          if (relevantFollowUps.length > 0) {
            const followUp = relevantFollowUps[0];
            choiceForm.followUpQuestion = {
              clientId: followUp.id,
              question: followUp.question,
              questionNumber: followUp.questionNumber,
              questionImage: followUp.questionImageUrl || undefined,
              questionType: followUp.questionType,
              isRequired: followUp.isRequired,
              hasTextInput: followUp.hasTextInput || false,
              choices: followUp.choices.map(fc => ({
                clientId: fc.id,
                choiceOrder: fc.choiceOrder,
                choiceText: fc.choiceText,
                choiceImage: fc.choiceImageUrl || undefined,
                id: fc.id,
                hasTextInput: fc.hasTextInput || false,
                hasFollowUp: false
              })),
              gridRows: followUp.gridRows.map(r => ({
                id: r.id,
                rowNumber: r.rowNumber,
                rowText: r.rowText,
                rowImage: r.rowImageUrl || undefined
              })),
              isFollowUp: true,
              parentQuestionClientId: entry.id,
              triggerChoiceClientIds: [choice.id],
              parentQuestionId: followUp.parentQuestionId || undefined,
              triggerChoiceIds: followUp.triggerChoiceIds,
              id: followUp.id
            };
          }
          
          return choiceForm;
        }),
        gridRows: entry.gridRows.map(r => ({
          id: r.id,
          rowNumber: r.rowNumber,
          rowText: r.rowText,
          rowImage: r.rowImageUrl || undefined
        })),
        isFollowUp: false,
        id: entry.id
      };
      
      return formEntry;
    });
    
    return {
      title: section.title,
      description: section.description || undefined,
      sectionNumber: section.sectionNumber,
      entries: processedEntries,
      id: section.id
    };
  });
};

/**
 * Flatten entries for API submission (extract follow-ups from choices)
 * Note: This also preserves File objects for FormData building
 */
export const flattenEntriesForPayload = (entries: SurveyEntryForm[]): (SurveyEntryPayload & { 
  questionImageFile?: File;
  choices: (SurveyChoicePayload & { choiceImageFile?: File })[];
  gridRows: (SurveyGridRowPayload & { rowImageFile?: File })[];
})[] => {
  const result: (SurveyEntryPayload & { 
    questionImageFile?: File;
    choices: (SurveyChoicePayload & { choiceImageFile?: File })[];
    gridRows: (SurveyGridRowPayload & { rowImageFile?: File })[];
  })[] = [];
  let questionNumber = 1;
  
  entries.forEach(entry => {
    // Add main question
    result.push({
      clientId: entry.clientId,
      question: entry.question,
      questionNumber: questionNumber++,
      questionImage: entry.questionImage,
      questionImageFile: entry.questionImageFile, // Preserve File for FormData
      questionType: entry.questionType,
      isRequired: entry.isRequired,
      hasTextInput: entry.hasTextInput || false,
      choices: entry.choices.map((c, ci) => ({
        clientId: c.clientId,
        choiceOrder: c.choiceOrder || String.fromCharCode(65 + ci),
        choiceText: c.choiceText,
        choiceImage: c.choiceImage,
        choiceImageFile: c.choiceImageFile // Preserve File for FormData
      })),
      gridRows: entry.gridRows.map((r, ri) => ({
        rowNumber: r.rowNumber || ri + 1,
        rowText: r.rowText,
        rowImage: r.rowImage,
        rowImageFile: r.rowImageFile // Preserve File for FormData
      })),
      isFollowUp: false,
      parentQuestionClientId: undefined,
      triggerChoiceClientIds: undefined
    });
    
    // Extract and add follow-ups from choices
    entry.choices.forEach(choice => {
      if (choice.hasFollowUp && choice.followUpQuestion) {
        const followUp = choice.followUpQuestion;
        result.push({
          clientId: followUp.clientId,
          question: followUp.question,
          questionNumber: questionNumber++,
          questionImage: followUp.questionImage,
          questionImageFile: followUp.questionImageFile, // Preserve File for FormData
          questionType: followUp.questionType,
          isRequired: followUp.isRequired,
          hasTextInput: followUp.hasTextInput || false,
          choices: (followUp.choices || []).map((fc, fci) => ({
            clientId: fc.clientId,
            choiceOrder: fc.choiceOrder || String.fromCharCode(65 + fci),
            choiceText: fc.choiceText,
            choiceImage: fc.choiceImage,
            choiceImageFile: fc.choiceImageFile // Preserve File for FormData
          })),
          gridRows: (followUp.gridRows || []).map((r, ri) => ({
            rowNumber: r.rowNumber || ri + 1,
            rowText: r.rowText,
            rowImage: r.rowImage,
            rowImageFile: r.rowImageFile // Preserve File for FormData
          })),
          isFollowUp: true,
          parentQuestionClientId: entry.clientId,
          triggerChoiceClientIds: [choice.clientId]
        });
      }
    });
  });
  
  return result;
};

// =============================================================================
// Query Keys
// =============================================================================

export const surveyQueryKeys = {
  all: ['surveys'] as const,
  training: (trainingId: string) => ['surveys', 'training', trainingId] as const,
  detail: (surveyId: string, traineeId?: string) => ['surveys', 'detail', surveyId, traineeId] as const,
  sections: (surveyId: string) => ['surveys', 'sections', surveyId] as const,
};
