import type { Metadata } from 'next'
import EditorTataLetak from '@/ui/EditorTataLetak'
import '../editor.css'

export const metadata: Metadata = { title: 'Editor tata letak | Weton City' }

export default function Page() {
  return (
    <EditorTataLetak />
  )
}
