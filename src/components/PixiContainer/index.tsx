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

const BASE_WIDTH = 1920
const BASE_HEIGHT = 1080;

const MyComponent = () => {
  const drawCallback = useCallback((graphics: PixiGraphics) => {
    graphics.clear()
    graphics.setFillStyle({ color: 'red' })
    graphics.rect(0, 0, 100, 100)
    graphics.fill()
  }, [])

  return (
    <Application
      width={BASE_WIDTH}
      height={BASE_HEIGHT}
      antialias={false}
      autoDensity={false}
      backgroundAlpha={0}
    >
      <pixiContainer x={100} y={100}>
        <pixiGraphics draw={drawCallback} />
      </pixiContainer>
    </Application>
  )
}
export default MyComponent
