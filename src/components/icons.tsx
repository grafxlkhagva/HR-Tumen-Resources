import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={props.width || "1.5em"}
      height={props.height || "1.5em"}
      {...props}
    >
      <path fill="none" d="M0 0h256v256H0z" />
      <path
        fill="currentColor"
        d="M88 32v48H40v40h48v96h48v-96h48V80h-48V32h96v192H-8V32h96z"
        transform="translate(20 12)"
      >
        <animate
          attributeName="d"
          from="M88 32v48H40v40h48v96h48v-96h48V80h-48V32h96v192H-8V32h96z"
          to="M88 32v48H40v40h48v96h48v-96h48V80h-48V32h-48v192h-48V32h48z"
          dur="0.3s"
          begin="mouseenter"
          fill="freeze"
        />
        <animate
          attributeName="d"
          from="M88 32v48H40v40h48v96h48v-96h48V80h-48V32h-48v192h-48V32h48z"
          to="M88 32v48H40v40h48v96h48v-96h48V80h-48V32h96v192H-8V32h96z"
          dur="0.3s"
          begin="mouseleave"
          fill="freeze"
        />
      </path>
    </svg>
  );
}
