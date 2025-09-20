from flask import Blueprint, send_from_directory
import os

docs_bp = Blueprint('docs', __name__)

docs_path = os.path.join(os.getcwd(), 'docs/build/html')
tsdocs_path = os.path.join(os.getcwd(), 'docs/tsdoc')

@docs_bp.route('/docs/<path:filename>')
def serve_docs(filename):
    """
    Serves the Sphinx-generated HTML documentation.
    """
    return send_from_directory(docs_path, filename)

@docs_bp.route('/docs/')
def docs_index():
    """
    Redirects to the main documentation page.
    """
    return send_from_directory(docs_path, "index.html")

@docs_bp.route('/docs/_static/<path:filename>')
def serve_static(filename):
    """
    Serves static assets for Sphinx documentation
    """
    return send_from_directory(os.path.join(docs_path, '_static'), filename)

@docs_bp.route('/tsdocs/<path:filename>')
def serve_tsdocs(filename):
    """
    Serves the TypeDoc-generated HTML documentation.
    """
    return send_from_directory(tsdocs_path, filename)

@docs_bp.route('/tsdocs/')
def docs_tsindex():
    """
    Redirects to the main TypeDoc documentation page.
    """
    return send_from_directory(tsdocs_path, "index.html")

@docs_bp.route('/tsdocs/assets/<path:filename>')
def serve_tsstatic(filename):
    """
    Serves static assets for TypeDoc documentation
    """
    return send_from_directory(os.path.join(tsdocs_path, 'assets'), filename)