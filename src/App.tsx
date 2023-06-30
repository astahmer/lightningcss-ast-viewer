import { css } from '../styled-system/css'
import { button } from '../styled-system/recipes'
import './panda.css'

function App() {
  return (
    <>
      <div className={css({ fontSize: '2xl', fontWeight: 'bold' })}>Hello 🐼!</div>
      <div>
        <button
          className={button({ shape: 'circle' })}
          onClick={() => document.documentElement.classList.toggle('dark')}
        >
          Click me
        </button>
      </div>
    </>
  )
}

export default App
