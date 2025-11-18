#!/usr/bin/env ts-node

/**
 * Database Performance Analysis Script
 * 
 * Analyzes database performance by:
 * - Checking index usage
 * - Finding slow queries
 * - Analyzing table statistics
 * - Suggesting optimizations
 * 
 * Usage:
 *   ts-node scripts/analyze-db-performance.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface IndexStats {
  schemaname: string;
  tablename: string;
  indexname: string;
  idx_scan: number;
  idx_tup_read: number;
  idx_tup_fetch: number;
}

interface TableStats {
  schemaname: string;
  tablename: string;
  n_tup_ins: number;
  n_tup_upd: number;
  n_tup_del: number;
  n_live_tup: number;
  n_dead_tup: number;
  last_vacuum: Date | null;
  last_autovacuum: Date | null;
  last_analyze: Date | null;
  last_autoanalyze: Date | null;
}

interface SlowQuery {
  query: string;
  calls: number;
  total_time: number;
  mean_time: number;
  max_time: number;
}

async function analyzeIndexes() {
  console.log('\n📊 Index Usage Analysis\n');
  console.log('='.repeat(80));

  try {
    const indexes = await prisma.$queryRaw<IndexStats[]>`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as "idx_scan",
        idx_tup_read as "idx_tup_read",
        idx_tup_fetch as "idx_tup_fetch"
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan ASC
    `;

    const unusedIndexes = indexes.filter((idx) => idx.idx_scan === 0);
    const lowUsageIndexes = indexes.filter(
      (idx) => idx.idx_scan > 0 && idx.idx_scan < 10,
    );

    console.log(`\nTotal indexes: ${indexes.length}`);
    console.log(`Unused indexes (0 scans): ${unusedIndexes.length}`);
    console.log(`Low usage indexes (<10 scans): ${lowUsageIndexes.length}`);

    if (unusedIndexes.length > 0) {
      console.log('\n⚠️  Unused Indexes (consider removing):');
      unusedIndexes.forEach((idx) => {
        console.log(`  - ${idx.tablename}.${idx.indexname}`);
      });
    }

    if (lowUsageIndexes.length > 0) {
      console.log('\n⚠️  Low Usage Indexes:');
      lowUsageIndexes.forEach((idx) => {
        console.log(
          `  - ${idx.tablename}.${idx.indexname} (${idx.idx_scan} scans)`,
        );
      });
    }

    console.log('\n✅ Most Used Indexes:');
    indexes
      .filter((idx) => idx.idx_scan > 100)
      .sort((a, b) => b.idx_scan - a.idx_scan)
      .slice(0, 10)
      .forEach((idx) => {
        console.log(
          `  - ${idx.tablename}.${idx.indexname}: ${idx.idx_scan} scans`,
        );
      });
  } catch (error) {
    console.error('Error analyzing indexes:', error);
  }
}

async function analyzeTableStats() {
  console.log('\n📈 Table Statistics\n');
  console.log('='.repeat(80));

  try {
    const tables = await prisma.$queryRaw<TableStats[]>`
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as "n_tup_ins",
        n_tup_upd as "n_tup_upd",
        n_tup_del as "n_tup_del",
        n_live_tup as "n_live_tup",
        n_dead_tup as "n_dead_tup",
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
    `;

    console.log('\nTable Statistics:');
    tables.forEach((table) => {
      const deadRatio =
        table.n_live_tup > 0
          ? ((table.n_dead_tup / (table.n_live_tup + table.n_dead_tup)) * 100).toFixed(2)
          : '0.00';

      console.log(`\n  ${table.tablename}:`);
      console.log(`    Live tuples: ${table.n_live_tup.toLocaleString()}`);
      console.log(`    Dead tuples: ${table.n_dead_tup.toLocaleString()} (${deadRatio}%)`);
      console.log(`    Inserts: ${table.n_tup_ins.toLocaleString()}`);
      console.log(`    Updates: ${table.n_tup_upd.toLocaleString()}`);
      console.log(`    Deletes: ${table.n_tup_del.toLocaleString()}`);

      if (table.n_dead_tup > 1000) {
        console.log(
          `    ⚠️  High dead tuple ratio - consider VACUUM ${table.tablename}`,
        );
      }

      const lastAnalyze = table.last_analyze || table.last_autoanalyze;
      if (lastAnalyze) {
        const daysSinceAnalyze =
          (Date.now() - new Date(lastAnalyze).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceAnalyze > 7) {
          console.log(
            `    ⚠️  Last analyzed: ${daysSinceAnalyze.toFixed(1)} days ago - consider ANALYZE ${table.tablename}`,
          );
        }
      }
    });
  } catch (error) {
    console.error('Error analyzing table stats:', error);
  }
}

async function analyzeSlowQueries() {
  console.log('\n🐌 Slow Query Analysis\n');
  console.log('='.repeat(80));

  try {
    const slowQueries = await prisma.$queryRaw<SlowQuery[]>`
      SELECT 
        left(query, 200) as query,
        calls,
        total_exec_time as "total_time",
        mean_exec_time as "mean_time",
        max_exec_time as "max_time"
      FROM pg_stat_statements
      WHERE mean_exec_time > 100
      ORDER BY mean_exec_time DESC
      LIMIT 20
    `;

    if (slowQueries.length === 0) {
      console.log('\n✅ No slow queries found (pg_stat_statements might not be enabled)');
      console.log(
        '   To enable: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;',
      );
      return;
    }

    console.log(`\nFound ${slowQueries.length} slow queries (>100ms average):\n`);

    slowQueries.forEach((query, index) => {
      console.log(`${index + 1}. Mean time: ${query.mean_time.toFixed(2)}ms`);
      console.log(`   Calls: ${query.calls.toLocaleString()}`);
      console.log(`   Total time: ${query.total_time.toFixed(2)}ms`);
      console.log(`   Max time: ${query.max_time.toFixed(2)}ms`);
      console.log(`   Query: ${query.query}...`);
      console.log('');
    });
  } catch (error) {
    console.error('Error analyzing slow queries:', error);
    console.log(
      '\nNote: pg_stat_statements extension might not be enabled.',
    );
  }
}

async function checkConnectionPool() {
  console.log('\n🔌 Connection Pool Status\n');
  console.log('='.repeat(80));

  try {
    const connections = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) as count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;

    const activeConnections = Number(connections[0]?.count || 0);

    console.log(`\nActive connections: ${activeConnections}`);

    if (activeConnections > 50) {
      console.log('⚠️  High number of active connections - consider connection pooling');
    } else {
      console.log('✅ Connection count is healthy');
    }

    // Check max connections
    const maxConnections = await prisma.$queryRaw<Array<{ setting: string }>>`
      SELECT setting 
      FROM pg_settings 
      WHERE name = 'max_connections'
    `;

    if (maxConnections.length > 0) {
      const max = parseInt(maxConnections[0].setting, 10);
      const usagePercent = ((activeConnections / max) * 100).toFixed(1);
      console.log(`Max connections: ${max}`);
      console.log(`Usage: ${usagePercent}%`);

      if (parseFloat(usagePercent) > 80) {
        console.log('⚠️  High connection usage - consider increasing max_connections or using a pooler');
      }
    }
  } catch (error) {
    console.error('Error checking connection pool:', error);
  }
}

async function generateRecommendations() {
  console.log('\n💡 Optimization Recommendations\n');
  console.log('='.repeat(80));

  console.log(`
1. Index Optimization:
   - Review unused indexes and consider removing them
   - Add composite indexes for frequently filtered columns
   - Use partial indexes for WHERE conditions (e.g., WHERE isActive = true)

2. Query Optimization:
   - Use SELECT to fetch only needed fields
   - Implement pagination for large result sets
   - Use cursor-based pagination for better performance

3. Connection Pooling:
   - Configure connection_limit in DATABASE_URL
   - Recommended: connection_limit=10&pool_timeout=20
   - Use PgBouncer for production environments

4. Maintenance:
   - Run VACUUM regularly for tables with high dead tuple ratio
   - Run ANALYZE to update table statistics
   - Consider autovacuum tuning for high-traffic tables

5. Monitoring:
   - Enable pg_stat_statements extension
   - Monitor slow queries regularly
   - Set up alerts for connection pool exhaustion
  `);
}

async function main() {
  console.log('\n🔍 Database Performance Analysis');
  console.log('='.repeat(80));

  try {
    await analyzeIndexes();
    await analyzeTableStats();
    await analyzeSlowQueries();
    await checkConnectionPool();
    await generateRecommendations();

    console.log('\n✅ Analysis complete!\n');
  } catch (error) {
    console.error('\n❌ Error during analysis:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { main as analyzeDbPerformance };

