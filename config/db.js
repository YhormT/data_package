// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient();

// module.exports = prisma;


const { PrismaClient } = require('@prisma/client');

let prisma;

if (global.prisma) {
  prisma = global.prisma;
} else {
  prisma = new PrismaClient();
  global.prisma = prisma;
}

module.exports = prisma;