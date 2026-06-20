from sqlalchemy.orm import declarative_base

# 全项目共享同一个 declarative Base，确保模型和迁移读取的是同一份 metadata。
Base = declarative_base()
