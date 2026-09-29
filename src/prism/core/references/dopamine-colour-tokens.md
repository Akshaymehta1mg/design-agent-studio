# Dopamine 2.0 colour tokens

Use this reference whenever a wireframe, component treatment, annotation, or visual recommendation uses colour. It records the primitive palettes and semantic aliases from the supplied Dopamine 2.0 colour board.

## Application rule

- Components and wireframes must reference semantic or documented component tokens, not primitive colours.
- Primitive tokens exist to resolve semantic aliases, verify output, and support design-system maintenance. Do not choose a primitive because its hue looks appropriate.
- If the required role has no semantic token, inspect the relevant live component entry for a component token. If none exists, use the closest neutral semantic treatment and state the token gap; do not invent a semantic token.
- Never rely on colour alone. Pair states with text, an icon, shape, or action change.

## Primitive tokens

For stepped palettes, append the listed step to the prefix. Example: step `40` under `token.base.color.wellness-green` resolves to `token.base.color.wellness-green.40`.

| Palette or token | Board values |
| --- | --- |
| `token.base.color.brand.coral` | `#FF5443` |
| `token.base.color.brand.care-plan` | `#903E38` |
| `token.base.color.cool-neutral` | `0 #000000`; `10 #181A1F`; `20 #272B33`; `30 #414752`; `40 #4E5665`; `50 #626A7A`; `60 #868E9E`; `70 #A2A9B8`; `80 #BEC5D1`; `90 #DDE2EB`; `95 #EEF1F5`; `97 #F7F8FA`; `99 #FBFCFD`; `100 #FFFFFF` |
| `token.base.color.sunshine-yellow` | `10 #231D00`; `20 #3F3101`; `30 #715A09`; `40 #967500`; `50 #BF9514`; `60 #E8B828`; `70 #FBD101`; `80 #FCDD41`; `90 #FCE880`; `95 #FFF4C0`; `97 #FFF9D9`; `99 #FFFDF2` |
| `token.base.color.sunrise-glow` | `10 #2B0E03`; `20 #401504`; `30 #6F2305`; `40 #9D3004`; `50 #CE4009`; `60 #ED5213`; `70 #FF6C30`; `80 #FA8E63`; `90 #FCB295`; `95 #FFEDE6`; `97 #FEE9E1`; `99 #FFFBFA` |
| `token.base.color.comfort-pink` | `10 #5B0400`; `20 #50132F`; `30 #772A4D`; `40 #B1527F`; `50 #CC749C`; `60 #E79ABD`; `70 #F5B2D1`; `80 #F7C1DA`; `90 #F9CFE3`; `95 #FBDEEB`; `97 #FDECF4`; `99 #FFFBFD` |
| `token.base.color.healing-mauve` | `10 #41004B`; `20 #581463`; `30 #6E2A79`; `40 #864291`; `50 #9D59A8`; `60 #B470BE`; `70 #D786E4`; `80 #EEAAF9`; `90 #F1BAFA`; `95 #F5D0FC`; `97 #FAE5FD`; `99 #FEFBFF` |
| `token.base.color.wellness-green` | `10 #002C13`; `20 #004D21`; `30 #156437`; `40 #308956`; `50 #43A46D`; `60 #63C48D`; `70 #82D3A5`; `80 #96DAB3`; `90 #AFE3C5`; `95 #C7EDD7`; `97 #E0F6E9`; `99 #F8FFFB` |
| `token.base.color.precision-blue` | `10 #00233F`; `20 #003E6F`; `30 #065392`; `40 #0B66AF`; `50 #1772BB`; `60 #2F8AD3`; `70 #4AA5EE`; `80 #6BBDFF`; `90 #8FCDFF`; `95 #B3DDFF`; `97 #D6EDFF`; `99 #ECF8FF` |
| `token.base.color.white-alpha` | `10 #FFFFFF1A`; `20 #FFFFFF33`; `30 #FFFFFF4D`; `40 #FFFFFF66`; `50 #FFFFFF80`; `60 #FFFFFF99`; `70 #FFFFFFB2`; `80 #FFFFFFCC`; `90 #FFFFFFE5`; `95 #FFFFFFF2`; `97 #FFFFFFF7`; `100 #FFFFFF` |
| `token.base.color.vital-red` | `10 #280305`; `20 #4A050B`; `30 #87151F`; `40 #A3111E`; `50 #C50F1F`; `60 #FD3647`; `70 #FF6673`; `80 #FF9EA7`; `90 #FFB4BB`; `95 #FFCACF`; `97 #FFE0E3`; `99 #FFF6F7` |
| `token.base.color.corporate-horizon-blue` | `10 #002C30`; `20 #004950`; `30 #086E78`; `40 #008F9E`; `50 #0EB9CB`; `60 #1AC7D8`; `70 #38E5F6`; `80 #6EF2FF`; `90 #BEF9FF`; `95 #E5FDFF`; `97 #EEFEFF`; `99 #F6FEFF` |
| `token.base.color.golden` | `10 #E5B674`; `20 #E8BC7E`; `30 #EBC288`; `40 #EEC991`; `50 #F1CF9B`; `60 #F3D5A5`; `70 #F6DBAF`; `80 #F9E2B8`; `90 #FCE8C2`; `95 #FFEECC`; `97 #FFF2D8`; `99 #FFF6E4` |
| `token.base.color.brown` | `10 #190505`; `20 #290808`; `30 #320A0A`; `40 #543232`; `50 #765B5B`; `60 #8D7676`; `70 #9E8B8B`; `80 #AF9F9F`; `90 #C0B4B4`; `95 #D1C8C8`; `97 #DBD3D3`; `99 #E4DEDE` |
| `token.base.color.jovial-purple` | `10 #0F0A1C`; `20 #19102F`; `30 #241742`; `40 #33215D`; `50 #3F2975`; `60 #4C318C`; `70 #6350BA`; `80 #8974E7`; `90 #B4A4FF`; `95 #CEC4FF`; `97 #E3DDFF`; `99 #F2EFFF` |

White Alpha is intended for content on dark backgrounds, especially dark shades `10` and `20`.

## Semantic tokens

### Content

| Token | Primitive alias | Use |
| --- | --- | --- |
| `token.semantic.color.content.primary` | `{base.color.cool-neutral.10}` | Primary content |
| `token.semantic.color.content.secondary` | `{base.color.cool-neutral.30}` | Secondary content |
| `token.semantic.color.content.tertiary` | `{base.color.cool-neutral.50}` | Tertiary content |
| `token.semantic.color.content.disabled` | `{base.color.cool-neutral.70}` | Disabled content |
| `token.semantic.color.content.inverse-primary` | `{base.color.cool-neutral.100}` | Primary content on dark surfaces |
| `token.semantic.color.content.inverse-secondary` | `{base.color.white-alpha.80}` | Secondary content on dark surfaces |
| `token.semantic.color.content.inverse-tertiary` | `{base.color.white-alpha.60}` | Tertiary content on dark surfaces |
| `token.semantic.color.content.cta` | `{base.color.brand.coral}` | Inline CTA text |

### Stroke and divider

| Token | Primitive alias | Use |
| --- | --- | --- |
| `token.semantic.color.stroke.subtle` | `{base.color.cool-neutral.90}` | Subtle boundary |
| `token.semantic.color.stroke.moderate` | `{base.color.cool-neutral.80}` | Moderate boundary |
| `token.semantic.color.stroke.intense` | `{base.color.cool-neutral.40}` | High-emphasis boundary |
| `token.semantic.color.stroke.disable` | `{base.color.cool-neutral.70}` | Disabled boundary |
| `token.semantic.color.stroke.selected` | `{base.color.brand.coral}` | Selected boundary |
| `token.semantic.color.stroke.default` | `{base.color.cool-neutral.10}` | Default strong boundary |
| `token.semantic.color.divider.subtle` | `{base.color.cool-neutral.90}` | Subtle divider |
| `token.semantic.color.divider.moderate` | `{base.color.cool-neutral.80}` | Moderate divider |

### Background

| Token | Primitive alias | Use |
| --- | --- | --- |
| `token.semantic.color.background.primary` | `{base.color.cool-neutral.100}` | Primary surface |
| `token.semantic.color.background.subtle` | `{base.color.cool-neutral.95}` | Subtle grouped surface |
| `token.semantic.color.background.moderate` | `{base.color.cool-neutral.90}` | Moderate grouped surface |
| `token.semantic.color.background.disabled` | `{base.color.cool-neutral.70}` | Disabled surface |

### Icons

| Token | Primitive alias | Use |
| --- | --- | --- |
| `token.semantic.color.icons.primary` | `{base.color.cool-neutral.10}` | Primary icon |
| `token.semantic.color.icons.secondary` | `{base.color.cool-neutral.30}` | Secondary icon |
| `token.semantic.color.icons.tertiary` | `{base.color.cool-neutral.50}` | Tertiary icon |
| `token.semantic.color.icons.disabled` | `{base.color.cool-neutral.70}` | Disabled icon |
| `token.semantic.color.icons.inverse` | `{base.color.cool-neutral.100}` | Icon on dark or brand surface |
| `token.semantic.color.icons.cta` | `{base.color.brand.coral}` | CTA icon |

### States

| Token | Primitive alias | Use |
| --- | --- | --- |
| `token.semantic.color.states.success` | `{base.color.wellness-green.40}` | Success |
| `token.semantic.color.states.offer` | `{base.color.wellness-green.40}` | Offer or saving |
| `token.semantic.color.states.error` | `{base.color.vital-red.40}` | Error or destructive consequence |
| `token.semantic.color.states.warning` | `{base.color.sunshine-yellow.50}` | Warning or caution |

There is no general information-state semantic token on the supplied board. Do not map `precision-blue` directly to an information state. Use a documented component token when available; otherwise use neutral content and icon semantics.

### Health in Hand

| Token | Primitive alias | Use |
| --- | --- | --- |
| `token.semantic.color.hih.normal` | `{base.color.wellness-green.40}` | Normal |
| `token.semantic.color.hih.borderline-abnormal` | `{base.color.sunshine-yellow.60}` | Borderline abnormal |
| `token.semantic.color.hih.needs-monitoring` | `{base.color.sunrise-glow.70}` | Needs monitoring |
| `token.semantic.color.hih.needs-attention` | `{base.color.vital-red.60}` | Needs attention |
| `token.semantic.color.hih.needs-immediate-attention` | `{base.color.vital-red.30}` | Needs immediate attention |

### Branding

| Token | Primitive alias | Use |
| --- | --- | --- |
| `token.semantic.color.branding.1mg` | `{base.color.brand.coral}` | 1mg |
| `token.semantic.color.branding.rapid` | `{base.color.healing-mauve.50}` | Rapid |
| `token.semantic.color.branding.care-plan` | `{base.color.brand.care-plan}` | Care Plan |
| `token.semantic.color.branding.corporate` | `{base.color.corporate-horizon-blue.30}` | Corporate |

Primitive palettes without a semantic alias are not available for arbitrary UI decoration. Use them only through a documented component or future semantic token.
