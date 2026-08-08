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



### Avance v1.1
🚀 Nuevos Módulos Implementados
1. Módulo de Insumos (/dashboard/insumos)
✅ Vista completa de catálogo de insumos con diseño MegaFood

✅ CRUD completo (Crear, Leer, Actualizar, Eliminar)

✅ Filtros por categoría con colores distintivos (Abarrotes, Frutas/Verduras, Cárnicos, Químicos, Descartables)

✅ Búsqueda en tiempo real por nombre

✅ Importación masiva desde Excel (.xlsx) con:

Detección de duplicados

Normalización automática de unidades (KG → kg, L → lt, etc.)

Conversión automática de unidades (ml ↔ L, g ↔ kg)

Vista previa antes de importar

Manejo de errores y feedback al usuario

✅ Campo de precio con formato en Soles peruanos (S/.)

✅ Botones de Editar/Eliminar con efecto hover (solo administradores)

2. Módulo de Platos (/dashboard/platos)
✅ Estructura de base de datos completa (sedes, platos, recetas)

✅ Gestión de platos por categoría (ENTRADA, CÁRNICO, GUARNICIÓN, POSTRE, BEBIBLE, SALSA)

✅ Recetas por sede con gramajes específicos

✅ Subcategorías para ENTRADAS (FRIO/CALIENTE)

✅ CRUD completo de platos y sus recetas

✅ Importación masiva desde Excel con:

Soporte para múltiples sedes (Green, Danper, Sol de Laredo)

Normalización de categorías y unidades

Conversión automática de unidades

Detección de duplicados

Reutilización de platos existentes entre sedes

Vista previa antes de importar

🔧 Mejoras Técnicas
Base de Datos
✅ Tabla sedes: nombre únicamente (campo obligatorio)

✅ Tabla platos: catálogo base con categorías

✅ Tabla recetas: relación plato × sede × insumo con cantidades

✅ Relaciones con claves foráneas y cascade delete

✅ Índices para optimización de consultas

✅ Políticas RLS (Row Level Security) implementadas

Seguridad
✅ Migración de getSession() a getUser() para autenticación segura

✅ Middleware actualizado para verificar tokens auténticos

✅ Corrección en DashboardLayout con autenticación segura

Experiencia de Usuario
✅ Diseño consistente con la identidad MegaFood

✅ Paleta de colores corporativa (#8CC63F, #F37F21, #2B2B2B)

✅ Filtros con colores por categoría

✅ Feedback visual en todas las acciones (loading, éxito, error)

✅ Modales para edición e importación

📦 Dependencias Actualizadas
✅ @sheetjs/xlsx (reemplazo seguro de xlsx) para importación de Excel

✅ Corrección de vulnerabilidad (ReDoS) en la librería de Excel
