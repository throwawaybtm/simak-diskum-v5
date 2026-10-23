import unittest

class TestEnvironment(unittest.TestCase):
    def test_imports(self):
        import serial
        import customtkinter
        import PyInstaller
        
        self.assertIsNotNone(serial)
        self.assertIsNotNone(customtkinter)
        self.assertIsNotNone(PyInstaller)

if __name__ == "__main__":
    unittest.main()
