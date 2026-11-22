import { createCn } from "cn/config"

/**
 * Class merging (clsx + Tailwind conflict resolution). Taught about LendLoop's
 * named text sizes from globals.css so `text-title text-success-foreground`
 * keeps both (a size and a colour), instead of dropping the size.
 */
export const cn = createCn({
  extend: {
    theme: {
      text: ["2xs", "label", "body", "lede", "title", "display-sm", "display", "display-lg"],
    },
  },
})
