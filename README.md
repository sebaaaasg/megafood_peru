# 🍽️ MEGA FOOD - Sistema de Gestión Agroindustrial

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Supabase](https://img.shields.io/badge/Supabase-Auth-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 📖 Descripción

**MEGA FOOD** es un sistema de gestión agroindustrial diseñado para optimizar el flujo de trabajo en cocinas industriales y restaurantes. La plataforma permite administrar desde el inventario de insumos hasta la programación de menús, pasando por la gestión de personal y requerimientos de cocina.

> **"De la lista de insumos al plato en la mesa. Todo tu flujo de cocina, en un solo lugar."**

---

## 🚀 Demo

🔗 **URL del Proyecto:** [https://tu-dominio.com](https://tu-dominio.com)

### Credenciales de prueba
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin@sistema.com` | `12345` | Administrador |

---

## ✨ Características Principales

### 🔐 Autenticación y Seguridad
- **Login seguro** con Supabase Auth
- **Protección de rutas** mediante middleware
- **Sesiones persistentes** con cookies HTTP-only
- **Redirección automática** a login si no hay sesión
- **Cierre de sesión** con limpieza de cookies
- **Múltiples sesiones simultáneas** permitidas

### 🎨 Interfaz de Usuario
- **Diseño "MegaFood"** con identidad visual única
- **Paleta corporativa exclusiva:**
  - 🟢 Verde lima: `#8CC63F` (destacados)
  - 🟠 Naranja: `#F37F21` (acentos y CTAs)
  - ⚫ Carbón: `#2B2B2B` (textos)
- **Header con textura** estilo tabla de cortar
- **Tarjetas tipo "comanda de cocina"** con perforaciones
- **Efectos hover** y transiciones suaves
- **Diseño completamente responsivo**

### 🏗️ Estructura del Sistema
El sistema está organizado en **6 estaciones operativas** que cubren todo el flujo de trabajo:

| Estación | Código | Función |
|----------|--------|---------|
| 👥 Personal | 01 | Roles y accesos por local |
| 📦 Insumos | 02 | Catálogo e inventario |
| 🍳 Recetas | 03 | Componentes de cada plato |
| 📅 Menús | 04 | Programación por semana |
| 🛒 Cocina | 05 | Requerimiento diario |
| 📋 Compras | 06 | Órdenes a proveedores |

---

## 🛠️ Tecnologías

### Frontend
- **[Next.js 16](https://nextjs.org/)** - Framework React con Server Components
- **[React 18](https://react.dev/)** - Biblioteca de UI
- **[TypeScript](https://www.typescriptlang.org/)** - Tipado estático
- **[Tailwind CSS](https://tailwindcss.com/)** - Estilizado utilitario
- **[Lucide React](https://lucide.dev/)** - Iconos modernos y consistentes

### Backend & Autenticación
- **[Supabase](https://supabase.com/)** - Backend como servicio
  - Autenticación con email/contraseña
  - Gestión de sesiones
  - Row Level Security (RLS)
  - PostgreSQL database

### Infraestructura
- **[Vercel](https://vercel.com/)** - Hosting y despliegue
- **[Git](https://git-scm.com/)** - Control de versiones

---

## 📁 Estructura del Proyecto
