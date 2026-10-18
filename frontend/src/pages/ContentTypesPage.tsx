import ColorListEditor from '../components/ColorListEditor'

export default function ContentTypesPage() {
  return (
    <ColorListEditor
      endpoint="/api/content-types"
      title="Tipos de conteúdo"
      hint="A cor de cada tipo é a cor dos posts no calendário. Vale para todos os clientes."
    />
  )
}
