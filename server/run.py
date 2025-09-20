import os
import subprocess
import sys

VENV_DIR = ".venv"
DOCS_DIR = "docs"
FLASK_PORT = "8001"
FLASK_HOST = "0.0.0.0"
TESTS_DIR = "tests"

def activate_virtualenv():
    """Activate the virtual environment."""
    if not os.path.exists(VENV_DIR):
        print("Virtual environment not found. Please create one with 'python -m venv .venv'.")
        sys.exit(1)

    activate_script = os.path.join(VENV_DIR, "Scripts" if os.name == "nt" else "bin", "activate")
    if os.name != "nt":
        subprocess.run(["source", activate_script], shell=True, executable="/bin/bash")
    else:
        subprocess.run(activate_script, shell=True)

def install_dependencies():
    """Install dependencies from requirements.txt."""
    pip_loc = os.path.join(VENV_DIR, "Scripts" if os.name == "nt" else "bin", "pip3.exe" if os.name == "nt" else "pip3")
    if os.path.exists("requirements.txt"):
        subprocess.run([pip_loc, "install", "-r", "requirements.txt"], check=True)

def build_sphinx_docs():
    """Build Sphinx documentation."""
    python_loc = os.path.join(VENV_DIR, "Scripts" if os.name == "nt" else "bin", "python.exe" if os.name == "nt" else "python")
    if os.path.exists(DOCS_DIR):
        print("Building Sphinx documentation...")
        subprocess.run([python_loc, "-m", "sphinx.cmd.build", "-b", "html", "source", "build"], cwd=DOCS_DIR, check=True)
    else:
        print("Sphinx documentation directory not found.")

def run_tests():
    """Run the tests."""
    pytest_loc = os.path.join(VENV_DIR, "Scripts" if os.name == "nt" else "bin", "pytest.exe" if os.name == "nt" else "pytest")
    coverage_loc = os.path.join(VENV_DIR, "Scripts" if os.name == "nt" else "bin", "coverage.exe" if os.name == "nt" else "coverage")
    if os.path.exists(TESTS_DIR):
        print("Runnning tests...")
        subprocess.run([coverage_loc, "run", "-m", "pytest", TESTS_DIR, "-v"], check=True)
        subprocess.run([coverage_loc, "html"])
    else:
        print("Tests directory not found.")

def run_flask():
    """Run the Flask application."""
    flask_loc = os.path.join(VENV_DIR, "Scripts" if os.name == "nt" else "bin", "flask.exe" if os.name == "nt" else "flask")
    subprocess.run([flask_loc, "--app", "app", "run", "--debug", "--port", FLASK_PORT, "--host", FLASK_HOST])

if __name__ == "__main__":
    activate_virtualenv()
    install_dependencies()

    try:
        build_sphinx_docs()
    except:
        print("Docs failed to build")

    try:
        run_tests()
    except:
        print("Tests failed")

    run_flask()
