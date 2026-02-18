"use client"

import { useParams } from "next/navigation"
import { CurriculumStructure } from "../components/curriculum-structure"

export default function CurriculumBuilderPage() {
  const params = useParams()
  const trainingId = params.trainingId as string

  return <CurriculumStructure trainingId={trainingId} />
}
