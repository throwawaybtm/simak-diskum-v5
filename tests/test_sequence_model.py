import unittest
import os
import tempfile

class TestSequenceModel(unittest.TestCase):
    def setUp(self):
        from src.sequence_model import SequenceModel, ServoStep
        self.model = SequenceModel()
        self.ServoStep = ServoStep

    def test_add_and_get_steps(self):
        res1 = self.model.add_step(angle=90, speed_ms=20, wait_ms=500)
        res2 = self.model.add_step(angle=180, speed_ms=0, wait_ms=1000)
        self.assertTrue(res1)
        self.assertTrue(res2)
        self.assertEqual(len(self.model.get_steps()), 2)
        self.assertEqual(self.model.get_steps()[0].angle, 90)
        self.assertEqual(self.model.get_steps()[0].speed_ms, 20)
        self.assertEqual(self.model.get_steps()[0].wait_ms, 500)
        self.assertEqual(self.model.get_steps()[1].angle, 180)
        self.assertEqual(self.model.get_steps()[1].speed_ms, 0)
        self.assertEqual(self.model.get_steps()[1].wait_ms, 1000)

    def test_validation_bounds(self):
        # Angle out of bounds
        self.assertFalse(self.model.add_step(-1, 20, 500))
        self.assertFalse(self.model.add_step(181, 20, 500))
        # Negative speed_ms
        self.assertFalse(self.model.add_step(90, -5, 500))
        # Negative wait_ms
        self.assertFalse(self.model.add_step(90, 20, -10))

    def test_max_30_steps(self):
        for i in range(30):
            self.assertTrue(self.model.add_step(i % 180, 15, 100))
        # 31st step should be rejected
        self.assertFalse(self.model.add_step(90, 20, 500))
        self.assertEqual(len(self.model.get_steps()), 30)

    def test_delete_and_clear(self):
        self.model.add_step(10, 5, 100)
        self.model.add_step(20, 10, 200)
        self.model.add_step(30, 15, 300)

        self.assertTrue(self.model.delete_step(1))
        steps = self.model.get_steps()
        self.assertEqual(len(steps), 2)
        self.assertEqual(steps[0].angle, 10)
        self.assertEqual(steps[0].speed_ms, 5)
        self.assertEqual(steps[1].angle, 30)
        self.assertEqual(steps[1].speed_ms, 15)

        # Invalid index
        self.assertFalse(self.model.delete_step(99))

        self.model.clear()
        self.assertEqual(len(self.model.get_steps()), 0)

    def test_to_protocol_string_with_speed(self):
        self.model.add_step(0, 10, 500)
        self.model.add_step(90, 25, 250)
        self.model.add_step(180, 0, 1000)

        cmd = self.model.to_protocol_string()
        self.assertEqual(cmd, "REC:0,10,500;90,25,250;180,0,1000")

    def test_json_roundtrip_with_speed(self):
        self.model.add_step(45, 30, 300)
        self.model.add_step(135, 10, 600)

        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
            temp_path = tf.name

        try:
            self.model.save_to_json(temp_path)
            
            from src.sequence_model import SequenceModel
            new_model = SequenceModel()
            new_model.load_from_json(temp_path)

            self.assertEqual(len(new_model.get_steps()), 2)
            self.assertEqual(new_model.get_steps()[0].angle, 45)
            self.assertEqual(new_model.get_steps()[0].speed_ms, 30)
            self.assertEqual(new_model.get_steps()[0].wait_ms, 300)
            self.assertEqual(new_model.get_steps()[1].angle, 135)
            self.assertEqual(new_model.get_steps()[1].speed_ms, 10)
            self.assertEqual(new_model.get_steps()[1].wait_ms, 600)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_json_load_backward_compatible(self):
        import json
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as tf:
            # Older JSON format without speed_ms
            json.dump({"steps": [{"angle": 60, "wait_ms": 400}]}, tf)
            temp_path = tf.name

        try:
            from src.sequence_model import SequenceModel
            new_model = SequenceModel()
            new_model.load_from_json(temp_path)

            self.assertEqual(len(new_model.get_steps()), 1)
            self.assertEqual(new_model.get_steps()[0].angle, 60)
            self.assertEqual(new_model.get_steps()[0].speed_ms, 0)
            self.assertEqual(new_model.get_steps()[0].wait_ms, 400)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

if __name__ == "__main__":
    unittest.main()
