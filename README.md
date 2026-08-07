🎯 Objetivo del proyecto
Sistema de gestión agroindustrial con autenticación segura y panel de administración visual.

✨ Características implementadas
1. Autenticación y Seguridad
✅ Login con Supabase (email/contraseña)

✅ Middleware para proteger rutas

✅ Sesiones persistentes con cookies

✅ Redirección automática a login si no hay sesión

✅ Cierre de sesión funcional

2. Interfaz de Usuario
✅ Diseño "MegaFood" con paleta corporativa

✅ Colores: Verde lima (#8CC63F) y Naranja (#F37F21)

✅ Header con textura estilo tabla de cortar

✅ Menú de estaciones operativas (01-06)

✅ Tarjetas con efecto hover y perforaciones estilo ticket de cocina

✅ Responsive en mobile, tablet y desktop

📁 proyecto/
├── 📁 app/
│   ├── 📁 dashboard/
│   │   └── page.tsx          # Panel principal
│   ├── 📁 login/
│   │   └── page.tsx          # Página de autenticación
│   └── layout.tsx             # Layout global
├── 📁 components/
│   ├── MainMenu.tsx           # Menú principal con autenticación
│   ├── LogoutButton.tsx       # Botón de cierre de sesión
│   └── StationCard.tsx        # Tarjetas de estaciones
├── 📁 lib/
│   └── 📁 supabase/
│       ├── client.ts          # Cliente de navegador
│       └── server.ts          # Cliente de servidor
├── middleware.ts              # Protección de rutas
├── .env.local                 # Variables de entorno
└── package.json               # Dependencias

4. Tecnologías Utilizadas
Next.js 16 (Turbopack)

Supabase (Autenticación)

React (Client/Server Components)

Tailwind CSS

Lucide React (Iconos)

TypeScript

5. Funcionalidades Específicas
✅ Usuario demo: admin@sistema.com / 12345

✅ Navegación entre estaciones del dashboard

✅ Nombres de usuario extraídos automáticamente del email

✅ Fecha actual formateada en español

✅ Múltiples sesiones simultáneas permitidas

✅ Estilo visual consistente en toda la aplicación

Comandos de desarrollo:
npm run dev     # Iniciar en desarrollo
npm run build   # Construir para producción
npm start       # Iniciar en producción