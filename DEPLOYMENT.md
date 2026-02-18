# Guía de Despliegue - Amplify Adapter

Esta guía es para el programador principal del proyecto `amplify-adapter`. Aquí encontrarás toda la información necesaria sobre cómo manejar el versionado, releases y despliegues automáticos.

## 📁 Estructura del Proyecto

```
amplify-adapter/
├── .github/workflows/
│   ├── ci.yml              # Linting y tests
│   ├── release.yml         # Release automático en main
│   └── release-next.yml    # Release automático en next
├── .changeset/             # Archivos de changesets
├── src/                    # Código fuente
├── tests/                  # Tests
├── package.json            # Configuración del paquete
└── pnpm-lock.yaml          # Lockfile de pnpm
```

## 🚀 Sistema de Versionado

Usamos [Changesets](https://github.com/changesets/changesets) para manejar versiones automáticamente.

### Tipos de Cambios

- **patch**: Cambios menores, corrección de bugs (ej: `1.2.1` → `1.2.2`)
- **minor**: Nuevas funcionalidades compatibles (ej: `1.2.1` → `1.3.0`)
- **major**: Cambios incompatibles (ej: `1.2.1` → `2.0.0`)

## 🌿 Ramas y Despliegues

### Rama `main`

- **Propósito**: Producción, versiones estables
- **Despliegue**: Automático al hacer push/merge
- **Versión**: Final (ej: `1.2.2`)
- **Workflow**: `release.yml`

### Rama `next`

- **Propósito**: Desarrollo, testing de nuevas features
- **Despliegue**: Automático al hacer push
- **Versión**: Pre-release (ej: `1.2.1-next.1`, `1.2.1-next.2`)
- **Workflow**: `release-next.yml`

## 📝 Cómo Crear un Changeset

1. **Haz tus cambios en el código**

2. **Crea un changeset**:

   ```bash
   pnpm changeset
   ```

3. **Selecciona el tipo de cambio**:
   - Usa las flechas para navegar
   - Presiona espacio para seleccionar
   - Enter para confirmar

4. **Escribe la descripción del cambio**:
   - Describe qué cambió y por qué

5. **El changeset se crea automáticamente** en `.changeset/`

## 🔄 Flujo de Trabajo

### Para Cambios en Producción (`main`)

```bash
# 1. Crea rama desde main
git checkout main
git pull
git checkout -b feature/nueva-funcionalidad

# 2. Haz tus cambios
# ... código ...

# 3. Crea changeset
pnpm changeset

# 4. Commit y push
git add .
git commit -m "feat: nueva funcionalidad"
git push origin feature/nueva-funcionalidad

# 5. Crea PR hacia main
# El workflow creará automáticamente un PR de release

# 6. Al mergear el PR de release, se publica en npm
```

### Para Cambios en Desarrollo (`next`)

```bash
# 1. Crea rama desde next
git checkout next
git pull
git checkout -b feature/experimental

# 2. Haz tus cambios
# ... código ...

# 3. Crea changeset
pnpm changeset

# 4. Commit y push
git add .
git commit -m "feat: funcionalidad experimental"
git push origin feature/experimental

# 5. Crea PR hacia next
# Se publica automáticamente como pre-release (ej: 1.2.1-next.1)
```

## ⚙️ Workflows de GitHub Actions

### CI (`ci.yml`)

- **Trigger**: Pull requests
- **Acciones**:
  - Checkout código
  - Setup Node.js 20 + pnpm
  - Install dependencies
  - Run linting
  - Tests (comentado actualmente)

### Release Main (`release.yml`)

- **Trigger**: Push a `main`
- **Acciones**:
  - Build package
  - Ejecuta `changesets/action`
  - Crea PR de release o publica en npm

### Release Next (`release-next.yml`)

- **Trigger**: Push a `next`
- **Acciones**:
  - Build package
  - Versiona con `changeset version --tag next`
  - Publica con `pnpm publish --tag next`

## 📦 Comandos Importantes

```bash
# Instalar dependencias
pnpm install

# Build del paquete
pnpm build

# Linting
pnpm lint

# Formatear código
pnpm format

# Crear changeset
pnpm changeset

# Ver changesets pendientes
pnpm changeset status

# Versionar manualmente (solo si es necesario)
pnpm changeset version

# Publicar manualmente
pnpm release

# Publicar versión next manualmente
pnpm version:next
pnpm release:next
```

## 📊 Versionado Automático

### En main

- Changesets se acumulan en un PR de release
- Al mergear, se incrementa la versión y se publica

### En next

- Cada push con changeset crea una nueva pre-release
- Versión: `X.Y.Z-next.N` donde N incrementa automáticamente

## 🐛 Troubleshooting

### El workflow no se ejecuta

- Verifica que el push sea a la rama correcta
- Revisa los secrets de GitHub
- Chequea los logs del workflow

### Error al publicar en npm

- Verifica `NPM_TOKEN`
- Asegúrate de que el paquete no exista ya
- Revisa permisos en npm

### Changesets no se crean

- Ejecuta `pnpm changeset` en la raíz del proyecto
- Asegúrate de que hay cambios en archivos tracked

## 📚 Recursos Útiles

- [Changesets Documentation](https://github.com/changesets/changesets)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [npm Publishing](https://docs.npmjs.com/cli/v9/commands/npm-publish)

---

**Nota**: Esta guía asume que tienes configurado pnpm, Node.js 20 y acceso a npm con permisos de publicación.
