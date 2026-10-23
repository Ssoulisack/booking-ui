import { useEffect, useRef, useState } from "react"

/**
 * The index of the section (by element id) the page is scrolled to: the last one whose top has
 * passed the top bar. `jump` scrolls to a section and holds the answer until the scroll ends, so
 * the highlight goes straight to the tapped item instead of stepping through the ones between.
 */
export function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(0)
  const held = useRef(0)
  const key = ids.join("|")

  useEffect(() => {
    let raf = 0
    const read = () => {
      raf = 0
      if (performance.now() < held.current) return
      const list = key ? key.split("|") : []
      const atEnd =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4
      let next = 0
      list.forEach((id, i) => {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 140) next = i
      })
      if (atEnd && list.length > 1) next = list.length - 1
      setActive(next)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    read()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [key])

  const jump = (index: number) => {
    const el = document.getElementById(key.split("|")[index] ?? "")
    if (!el) return
    held.current = performance.now() + 900
    setActive(index)
    el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return { active, jump }
}
