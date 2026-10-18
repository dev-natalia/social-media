import ColorListEditor from '../components/ColorListEditor'

export default function PlatformsPage() {
  return <ColorListEditor endpoint="/api/platforms" title="Redes" hint="As redes que aparecem para escolher em cada post." />
}
