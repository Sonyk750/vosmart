import { prisma } from "@/lib/prisma";

type UtilizatorSesiune = { id: string; role: string };

/**
 * „Are omul asta voie la asociatia asta?" — o singura regula, scrisa o data.
 *
 * Regula difera pe roluri si e usor de gresit daca fiecare ruta si-o rescrie:
 *   admin      — vede tot;
 *   cenzor     — doar asociatiile care i-au fost ALOCATE (CenzorAllocation);
 *   corporate  — doar asociatiile de sub contul lui de firma;
 *   client     — doar asociatia lui.
 *
 * Exact din rescrierea pe la fiecare ruta a iesit o gaura intr-un ecran de
 * detaliu client, unde clauza pentru cenzor lipsea cu totul.
 */
export async function poateVedeaAsociatia(
  user: UtilizatorSesiune,
  associationId: string,
): Promise<boolean> {
  if (user.role === "admin") return true;

  if (user.role === "cenzor") {
    const alocare = await prisma.cenzorAllocation.findFirst({
      where: { cenzorId: user.id, associationId },
      select: { id: true },
    });
    return Boolean(alocare);
  }

  const asociatie = await prisma.association.findUnique({
    where: { id: associationId },
    select: { userId: true, corporate: { select: { userId: true } } },
  });
  if (!asociatie) return false;

  // Asociatia proprie (rol client) sau una de sub firma pe care o conduce.
  return asociatie.userId === user.id || asociatie.corporate?.userId === user.id;
}
