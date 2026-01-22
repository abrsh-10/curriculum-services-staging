"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

interface SectionMetaModalProps {
  isOpen: boolean
  onClose: () => void
  sectionIndex: number
  totalSections: number
  initialTitle: string
  initialDescription: string
  initialOrder: number
  onSave: (payload: { title: string; description: string; order: number }) => Promise<void> | void
  isSaving?: boolean
}

export function SectionMetaModal({
  isOpen,
  onClose,
  sectionIndex,
  totalSections,
  initialTitle,
  initialDescription,
  initialOrder,
  onSave,
  isSaving = false
}: SectionMetaModalProps) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [order, setOrder] = useState(initialOrder)
  const [localSaving, setLocalSaving] = useState(false)

  const saving = isSaving || localSaving

  useEffect(() => {
    setTitle(initialTitle)
    setDescription(initialDescription)
    setOrder(initialOrder)
  }, [initialTitle, initialDescription, initialOrder, sectionIndex])

  const handleSave = async () => {
    if (!title.trim() || saving) return
    setLocalSaving(true)
    try {
      await onSave({ title: title.trim(), description, order })
    } finally {
      setLocalSaving(false)
    }
  }
 
   return (
     <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
       <DialogContent className="sm:max-w-[560px]">
         <DialogHeader>
           <DialogTitle>Edit Section</DialogTitle>
         </DialogHeader>
 
         <div className="space-y-5 pt-2">
           <div className="space-y-2">
             <Label htmlFor="sec-title">Title</Label>
             <Input
               id="sec-title"
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               placeholder="Section title"
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="sec-desc">Description</Label>
             <Textarea
               id="sec-desc"
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               placeholder="Section description"
               className="min-h-[96px]"
             />
           </div>
 
           <div className="space-y-2">
             <Label htmlFor="sec-order">Order</Label>
             <select
               id="sec-order"
               className="border rounded-md text-sm px-2 py-2 bg-white w-full"
               value={order}
               onChange={(e) => setOrder(Number(e.target.value))}
             >
               {Array.from({ length: totalSections }, (_, i) => i + 1).map((n) => (
                 <option key={n} value={n}>{n}</option>
               ))}
             </select>
           </div>
 
           <div className="flex justify-end gap-2 pt-2">
             <Button variant="outline" onClick={onClose} disabled={saving}>
               Cancel
             </Button>
             <Button className="text-white" onClick={handleSave} disabled={saving || !title.trim()}>
               {saving ? "Saving..." : "Save"}
             </Button>
           </div>
         </div>
       </DialogContent>
     </Dialog>
   )
 }
 

