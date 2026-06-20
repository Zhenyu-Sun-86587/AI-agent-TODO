from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import settings
from app.db.base import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 数据库地址以应用配置为准，避免 alembic.ini 和运行时环境出现两套来源。
config.set_main_option("sqlalchemy.url", settings.database_url)
# Base.metadata 来自 app.db.base；新增模型必须在那里导入后才能被 Alembic 发现。
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    # 离线模式只生成 SQL，不建立数据库连接，适合审阅或手工执行迁移脚本。
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # 在线模式使用 Alembic 自己的短连接执行迁移，不复用应用请求级 Session。
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # 将当前连接和模型元数据交给 Alembic，保证 autogenerate 对比同一套表定义。
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
