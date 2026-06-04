# 作业 1：LaTeX 项目计划书与功能草图

本目录包含 `AI-agent-TODO` 的 LaTeX 版前期项目计划书与功能草图。

## 文件说明

- `assignment1_plan_sketch.tex`：LaTeX 源文件，包含项目计划书、功能草图和统一风格 TikZ 图。
- `assignment1_plan_sketch.pdf`：使用 XeLaTeX 编译后生成的 PDF 文件。

## 编译方式

```bash
cd doc/作业1
latexmk -xelatex -interaction=nonstopmode -halt-on-error assignment1_plan_sketch.tex
```

如需清理中间文件：

```bash
latexmk -C assignment1_plan_sketch.tex
```
