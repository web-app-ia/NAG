import { useEffect, useState } from "react";
import * as hallConfig from "../../net/hallConfig";

// Hook React : retourne la configuration du hall (avec valeurs par defaut
// fusionnees) et se re-abonne aux changements (sauvegarde admin, reload).
export function useHallConfig() {
  const [cfg, setCfg] = useState(() => ({ ...hallConfig.DEFAULT_HALL, ...hallConfig.get() }));

  useEffect(() => {
    let alive = true;
    hallConfig.load().then((c) => {
      if (alive) setCfg({ ...hallConfig.DEFAULT_HALL, ...c });
    });
    const unsub = hallConfig.onChange((c) => {
      setCfg({ ...hallConfig.DEFAULT_HALL, ...c });
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  return cfg;
}

export default useHallConfig;
