# prisma-generator-drizzle

**prisma-generator-drizzle** is a [Prisma](https://www.prisma.io/) custom generator that allows you to generate a [Drizzle](https://orm.drizzle.team/) schema. It is specifically designed for (existing) projects that are using Prisma and want to migrate to Drizzle, or for projects that want to use both Prisma and Drizzle together.

In this version, the focus is on the query and mutation capabilities of the generated Drizzle schema.

## Usage

### 1. Install the package

```bash
npm install -D prisma-generator-drizzle
npm install drizzle-orm
```

### 2. Add to your Prisma schema

```prisma
generator drizzle {
  provider = "prisma-generator-drizzle"
  // Optional: specify the output directory
  // output = "../models"
}
```

### 3. Run the generator

```bash
prisma generate
```
