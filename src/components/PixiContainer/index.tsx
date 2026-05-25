import {
  Application,
  extend,
} from '@pixi/react'
import {
  Container,
  Graphics,
  type Graphics as PixiGraphics,
} from 'pixi.js'
import { useCallback } from 'react'

extend({
  Container,
  Graphics,
})

const MyComponent = () => {
  const drawCallback = useCallback((graphics: PixiGraphics) => {
    graphics.clear()
    graphics.setFillStyle({ color: 'red' })
    graphics.rect(0, 0, 100, 100)
    graphics.fill()
  }, [])

  return (
    <Application>
      <pixiContainer x={100} y={100}>
        <pixiGraphics draw={drawCallback} />
      </pixiContainer>
    </Application>
  )
}
export default MyComponent
