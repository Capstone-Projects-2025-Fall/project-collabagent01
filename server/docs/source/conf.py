import os
import sys
sys.path.insert(0, os.path.abspath("../.."))  # Add webserver to path
sys.path.insert(0, os.path.abspath("../../app"))  # Add app to path

# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = 'Github Copilot Project'
copyright = '2025, Team 2'
author = 'Team 2'
release = '0.0.1'

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
    'sphinx.ext.autodoc',  # Extracts documentation from docstrings
    'sphinx.ext.napoleon',  # Supports Google-style docstrings
    'sphinx.ext.viewcode',  # Adds links to source code
]

templates_path = ['_templates']
exclude_patterns = []



# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = "sphinx_rtd_theme"
# html_static_path = ['_static']
