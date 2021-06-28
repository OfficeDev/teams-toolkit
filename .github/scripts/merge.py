import os
import re


def copy_folder_recursive_with_ignore(srcfolder, dstfolder, ignores=[]):
    os.makedirs(dstfolder, exist_ok=True)
    entries = []
    with os.scandir(srcfolder) as itr:
        entries = list(itr)
    for entry in entries:
        src = os.path.join(srcfolder, entry.name)
        dst = os.path.join(dstfolder, entry.name)

        should_copy = all([item is None for item in [*map(lambda i: re.match(i, src), ignores)]])
        if should_copy:
            if entry.is_dir():
                copy_folder_recursive_with_ignore(src, dst, ignores)
            else:
                open(dst, 'wb').write(open(src, 'rb').read())


# merge pkg reference
def merge_pkg_reference(bot_lines, me_lines, merged_lines):
    for line in me_lines:
        if not line.startswith(("import", "const")):
            break
        if "botbuilder" not in line and line not in bot_lines:
            merged_lines.insert(0, line)


# merge functions in TeamsActivityHandler class
def merge_functions_in_class(bot_lines, me_lines, merged_lines):
    function_lines = []
    me_class_no = [id for id, s in enumerate(me_lines) if "extends TeamsActivityHandler" in s][0]
    bot_class_end = [id for id, s in enumerate(bot_lines) if s.rstrip() == "}"][0]

    me_class_end = me_class_no
    for i in range(me_class_no + 1, len(me_lines)):
        if me_lines[i].rstrip() != "}":
            function_lines.append(me_lines[i])
        else:
            me_class_end = i
            break
    function_lines.insert(0, "\n  // Message Extension Code\n")
    bot_lines[bot_class_end: bot_class_end] = function_lines
    bot_class_end += len(function_lines) + 1
    return bot_class_end, me_class_end


# merge functions out of TeamsActivityHandler class
def merge_functions_out_of_class(me_lines, merged_lines, bot_class_end, me_class_end):
    function_lines = []
    for i in range(me_class_end + 1, len(me_lines)):
        if "module.exports" in me_lines[i]:
            break
        function_lines.append(me_lines[i])
    merged_lines[bot_class_end + 1: bot_class_end + 1] = function_lines


def main():
    exts = ["js", "ts"]
    scenarios = ["default"]
    me_file_name = "messageExtensionBot"
    bot_file_name = "teamsBot"

    for ext in exts:
        for scenario in scenarios:
            bot_folder = "./templates/bot/{}/{}".format(ext, scenario)
            me_folder = "./templates/msgext/{}/{}".format(ext, scenario)
            combined_folder = "./templates/bot-msgext/{}/{}".format(ext, scenario)
            me_file = "{}/{}.{}".format(me_folder, me_file_name, ext)
            bot_file = "{}/{}.{}".format(bot_folder, bot_file_name, ext)
            combined_file = "{}/{}.{}".format(combined_folder, bot_file_name, ext)
            if os.path.exists(combined_file):
                os.remove(combined_file)

            copy_folder_recursive_with_ignore(bot_folder, combined_folder, [".*README.md", ".*images/.*"])
            bot_fh = open(bot_file)
            bot_content = bot_fh.readlines()
            me_fh = open(me_file)
            me_content = me_fh.readlines()
            merged_lines = bot_content

            merge_pkg_reference(bot_content, me_content, merged_lines)
            bot_class_end, me_class_end = merge_functions_in_class(bot_content, me_content, merged_lines)
            merge_functions_out_of_class(me_content, merged_lines, bot_class_end, me_class_end)

            combined_hd = open(combined_file, 'w')
            combined_hd.writelines(merged_lines)
            bot_fh.close()
            me_fh.close()
            combined_hd.close()


if __name__ == "__main__":
    main()