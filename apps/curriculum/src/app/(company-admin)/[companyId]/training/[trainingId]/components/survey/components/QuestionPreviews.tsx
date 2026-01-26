"use client"

import { Textarea } from "@/components/ui/textarea"
import { SurveyEntryForm } from "@/lib/hooks/survey-types"

export const PreviewText = ({ question }: { question: SurveyEntryForm }) => (
  <div className="space-y-3">
    <div>
      <p className="font-medium break-words whitespace-normal leading-relaxed">{question.question || "Text question will appear here"}</p>
      {question.questionImage && (
        <img src={question.questionImage} alt="question" className="mt-2 max-h-40 object-contain" />
      )}
    </div>
    <div className="ml-4">
      <Textarea
        placeholder="Trainee will type their answer here..."
        disabled
        className="bg-gray-50 border-gray-200"
        rows={3}
      />
    </div>
  </div>
)

export const PreviewRadio = ({ question }: { question: SurveyEntryForm }) => (
  <div className="space-y-3">
    <div>
      <p className="font-medium break-words whitespace-normal leading-relaxed">{question.question || "Radio question will appear here"}</p>
      {question.questionImage && (
        <img src={question.questionImage} alt="question" className="mt-2 max-h-40 object-contain" />
      )}
    </div>
    <div className="ml-4 space-y-2">
      {question.choices.map((choice, index) => (
        <div key={choice.clientId || index} className="flex items-start gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-gray-300 mt-0.5 flex-shrink-0"></div>
          <div className="flex flex-col">
            <span className="break-words whitespace-normal">
              {choice.choiceText || `Option ${index + 1}`}
            </span>
            {choice.choiceImage && (
              <img src={choice.choiceImage} alt="choice" className="mt-1 max-h-24 object-contain" />
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const PreviewCheckbox = ({ question }: { question: SurveyEntryForm }) => (
  <div className="space-y-3">
    <div>
      <p className="font-medium break-words whitespace-normal leading-relaxed">{question.question || "Checkbox question will appear here"}</p>
      {question.questionImage && (
        <img src={question.questionImage} alt="question" className="mt-2 max-h-40 object-contain" />
      )}
    </div>
    <div className="ml-4 space-y-2">
      {question.choices.map((choice, index) => (
        <div key={choice.clientId || index} className="flex items-start gap-2">
          <div className="w-4 h-4 border-2 border-gray-300 mt-0.5 flex-shrink-0"></div>
          <div className="flex flex-col">
            <span className="break-words whitespace-normal">
              {choice.choiceText || `Option ${index + 1}`}
            </span>
            {choice.choiceImage && (
              <img src={choice.choiceImage} alt="choice" className="mt-1 max-h-24 object-contain" />
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)

export const PreviewGrid = ({ question }: { question: SurveyEntryForm }) => (
  <div className="space-y-4">
    <div>
      <p className="font-medium break-words whitespace-normal leading-relaxed">{question.question || "Grid question will appear here"}</p>
      {question.questionImage && (
        <img src={question.questionImage} alt="question" className="mt-2 max-h-40 object-contain" />
      )}
    </div>
    <div className="ml-4 overflow-x-auto">
      <table className="border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2 bg-gray-50 text-left text-sm font-medium"></th>
            {question.choices.map((choice, index) => (
              <th key={choice.clientId || index} className="border border-gray-300 p-2 bg-gray-50 text-center text-sm font-medium min-w-20">
                {choice.choiceText || `Col ${index + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {question.gridRows.map((row, rowIndex) => (
            <tr key={row.id || rowIndex}>
              <td className="border border-gray-300 p-2 text-sm font-medium bg-gray-50">
                {row.rowText || `Row ${rowIndex + 1}`}
              </td>
              {question.choices.map((choice, colIndex) => (
                <td key={choice.clientId || colIndex} className="border border-gray-300 p-2 text-center">
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 mx-auto"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

export const QuestionPreview = ({ question }: { question: SurveyEntryForm }) => {
  const renderPreview = () => {
    switch (question.questionType) {
      case 'TEXT':
        return <PreviewText question={question} />
      case 'RADIO':
        return <PreviewRadio question={question} />
      case 'CHECKBOX':
        return <PreviewCheckbox question={question} />
      case 'GRID':
        return <PreviewGrid question={question} />
      default:
        return <div>Unknown question type</div>
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Question Preview</h3>
        <span className={`px-2 py-1 text-xs rounded ${
          question.isRequired 
            ? 'bg-red-100 text-red-700' 
            : 'bg-gray-100 text-gray-700'
        }`}>
          {question.isRequired ? 'Required' : 'Optional'}
        </span>
      </div>
      {renderPreview()}
    </div>
  )
}
