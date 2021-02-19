import React from 'react'
// require('@src/assets/svg/iconfont.js') //将下载文件中的iconfont.js引入

export default function Icon(props) {
  return (
    <svg className="icon" aria-hidden="true">
      <use xlinkHref={`#${props.type}`} />
      <style jsx="true">{`
        .icon {
          width: 1em;
          height: 1em;
          vertical-align: -0.15em;
          fill: currentColor;
          overflow: hidden;
        }
      `}</style>
    </svg>
  )
}
