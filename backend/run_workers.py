#!/usr/bin/env python3
"""
Face Recognition Workers CLI
Script to run background workers for processing face recognition jobs
"""

import asyncio
import logging
import sys
import signal
import argparse
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.services.face_recognition_worker import WorkerManager
from app.settings import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('workers.log')
    ]
)

logger = logging.getLogger(__name__)

class WorkerCLI:
    """CLI for managing face recognition workers"""
    
    def __init__(self):
        self.manager = None
        self.running = False
    
    async def start_workers(self, num_workers: int):
        """Start the specified number of workers"""
        try:
            logger.info(f"🚀 Starting {num_workers} face recognition workers")
            logger.info(f"Environment: {settings.ENVIRONMENT}")
            logger.info(f"AWS Region: {settings.AWS_REGION}")
            logger.info(f"Face Service URL: {settings.FACE_RECOGNITION_SERVICE_URL}")
            
            # Create worker manager
            self.manager = WorkerManager(num_workers=num_workers)
            self.running = True
            
            # Set up signal handlers
            self._setup_signal_handlers()
            
            # Start workers
            await self.manager.start_workers()
            
        except KeyboardInterrupt:
            logger.info("🛑 Received interrupt signal")
        except Exception as e:
            logger.error(f"❌ Error starting workers: {e}")
            sys.exit(1)
        finally:
            await self.cleanup()
    
    def _setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        def signal_handler(signum, frame):
            logger.info(f"📡 Received signal {signum}, initiating graceful shutdown...")
            self.running = False
            if self.manager:
                asyncio.create_task(self.manager.stop_workers())
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if self.manager:
                await self.manager.stop_workers()
            logger.info("🧹 Cleanup completed")
        except Exception as e:
            logger.error(f"❌ Error during cleanup: {e}")
    
    async def check_health(self):
        """Check worker and service health"""
        try:
            from app.services.sqs_service import get_sqs_service
            from app.services.job_tracker import get_job_tracker
            
            logger.info("🔍 Checking service health...")
            
            # Check SQS service
            try:
                sqs_service = await get_sqs_service()
                queue_stats = await sqs_service.get_queue_stats()
                logger.info(f"✅ SQS Service: {queue_stats}")
            except Exception as e:
                logger.error(f"❌ SQS Service: {e}")
            
            # Check job tracker
            try:
                job_tracker = await get_job_tracker()
                job_stats = await job_tracker.get_job_statistics()
                logger.info(f"✅ Job Tracker: {job_stats}")
            except Exception as e:
                logger.error(f"❌ Job Tracker: {e}")
            
            # Check face recognition service
            try:
                import httpx
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{settings.FACE_RECOGNITION_SERVICE_URL}/health",
                        timeout=10
                    )
                    if response.status_code == 200:
                        logger.info("✅ Face Recognition Service: Healthy")
                    else:
                        logger.warning(f"⚠️ Face Recognition Service: {response.status_code}")
            except Exception as e:
                logger.error(f"❌ Face Recognition Service: {e}")
            
        except Exception as e:
            logger.error(f"❌ Health check failed: {e}")
    
    async def show_stats(self):
        """Show current statistics"""
        try:
            from app.services.sqs_service import get_sqs_service
            from app.services.job_tracker import get_job_tracker
            
            logger.info("📊 Current Statistics:")
            
            # SQS stats
            sqs_service = await get_sqs_service()
            queue_stats = await sqs_service.get_queue_stats()
            
            print("\n🔄 Queue Statistics:")
            for queue_name, stats in queue_stats.items():
                if isinstance(stats, dict) and "error" not in stats:
                    print(f"  {queue_name}:")
                    print(f"    Available: {stats.get('messages_available', 0)}")
                    print(f"    In Flight: {stats.get('messages_in_flight', 0)}")
                    print(f"    Delayed: {stats.get('messages_delayed', 0)}")
            
            # Job tracker stats
            job_tracker = await get_job_tracker()
            job_stats = await job_tracker.get_job_statistics()
            
            print("\n📈 Job Statistics:")
            print(f"  Total Jobs: {job_stats.get('total_jobs', 0)}")
            print(f"  Active Subscriptions: {job_stats.get('active_subscriptions', 0)}")
            print(f"  Recent Jobs (24h): {job_stats.get('recent_jobs_24h', 0)}")
            
            status_breakdown = job_stats.get('status_breakdown', {})
            if status_breakdown:
                print("  Status Breakdown:")
                for status, count in status_breakdown.items():
                    print(f"    {status}: {count}")
            
        except Exception as e:
            logger.error(f"❌ Failed to show stats: {e}")

def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Face Recognition Workers CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_workers.py start --workers 2    # Start 2 workers
  python run_workers.py health               # Check service health
  python run_workers.py stats                # Show current statistics
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Start command
    start_parser = subparsers.add_parser('start', help='Start workers')
    start_parser.add_argument(
        '--workers', 
        type=int, 
        default=1, 
        help='Number of workers to start (default: 1)'
    )
    start_parser.add_argument(
        '--log-level', 
        default='INFO', 
        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
        help='Log level (default: INFO)'
    )
    
    # Health command
    health_parser = subparsers.add_parser('health', help='Check service health')
    
    # Stats command
    stats_parser = subparsers.add_parser('stats', help='Show statistics')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Configure log level
    if hasattr(args, 'log_level'):
        logging.getLogger().setLevel(getattr(logging, args.log_level))
    
    # Create CLI instance
    cli = WorkerCLI()
    
    try:
        if args.command == 'start':
            asyncio.run(cli.start_workers(args.workers))
        elif args.command == 'health':
            asyncio.run(cli.check_health())
        elif args.command == 'stats':
            asyncio.run(cli.show_stats())
    except KeyboardInterrupt:
        logger.info("🛑 Interrupted by user")
    except Exception as e:
        logger.error(f"❌ CLI error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()