import { useEffect, useRef } from 'react'
import { type Character } from '@/types'
import * as avatar from '@/services/avatar/avatar-service'

interface Props {
  character: Character
  /**
   * Width in px. Height defaults to `width * (CH/CW)` = proportional 2:3.
   * Pass `h` to override height explicitly.
   */
  size?: number
  w?: number
  h?: number
}

/** Pixel avatar canvas for a Character. Accepts `size` (width), or `w`+`h`. Height is proportional unless overridden. */
export function AvatarCanvas({ character, size, w, h }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const width  = w ?? size ?? avatar.CW
  const height = h ?? Math.round(width * avatar.CH / avatar.CW)
  useEffect(() => {
    if (ref.current) avatar.render(ref.current, { name: character.name, avatarData: character.avatarData })
  }, [character.name, character.avatarData])
  return <canvas ref={ref} style={{ width, height, imageRendering: 'pixelated', display: 'block' }} />
}
