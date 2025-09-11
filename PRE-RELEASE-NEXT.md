# Cómo activar pre-releases en la rama `next`

Para que los cambios en la rama `next` generen versiones pre-release (ejemplo: `1.2.2-next.0`), debes activar el ciclo de pre-release de Changesets. Sigue estos pasos:

## 1. Activar modo pre-release

En la rama `next`, ejecuta:

```bash
pnpm changeset pre enter next
```

Esto creará el ciclo de pre-release y los siguientes changesets generarán versiones tipo `1.2.2-next.0`, `1.2.2-next.1`, etc.

## 2. Trabaja normalmente

- Crea changesets y haz push a la rama `next`.
- El workflow publicará automáticamente las versiones pre-release con el tag `next`.

## 3. Finalizar el ciclo pre-release

Cuando quieras publicar una versión estable (por ejemplo, al mergear a `main`), ejecuta:

```bash
pnpm changeset pre exit
```

Esto termina el ciclo de pre-release y los siguientes cambiosets generarán versiones estables.

---

**Nota:** Si olvidas activar el modo pre-release, los cambios en `next` se publicarán como versiones estables.

## Automatización (opcional)

Puedes agregar este comando en tu documentación interna o como paso manual cada vez que crees la rama `next`.

---

**Resumen:**
- Activa el modo pre-release con `pnpm changeset pre enter next` en la rama `next`.
- Finaliza el ciclo con `pnpm changeset pre exit` cuando quieras publicar estable en `main`.

Esto asegura que los releases en `next` sean siempre pre-release y no afecten la versión estable del paquete.
