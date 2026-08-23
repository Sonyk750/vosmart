import RapoarteAiClient from "./RapoarteAiClient";

/**
 * Ce a iesit din verificarea automata, luna cu luna.
 *
 * Poarta si contractele vin din `layout.tsx`; contractul la care se lucreaza sta
 * in bara de sus si ajunge aici prin context, nu ca proprietate.
 */
export default function PaginaRapoarteAi() {
  return <RapoarteAiClient />;
}
