import Image from "next/image";

type BrandLogoProps = {
  priority?: boolean;
};

export function BrandLogo({ priority = false }: BrandLogoProps) {
  return (
    <div className="brand-mark" aria-hidden="true">
      <Image
        src="/logoo.png"
        alt=""
        width={56}
        height={56}
        className="brand-mark__image"
        priority={priority}
      />
    </div>
  );
}
