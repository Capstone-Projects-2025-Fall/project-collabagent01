from app_minimal import create_app

app = create_app()

if __name__ == '__main__':
    # Match extension LOCAL endpoint port (see extension endpoints.ts)
    app.run(host='0.0.0.0', port=8001, debug=True)
