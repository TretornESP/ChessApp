call ..\env\Scripts\activate.bat
python -m pip freeze > ..\requirements.txt
set FLASK_APP=backend.py
set FLASK_ENV=development
flask run
